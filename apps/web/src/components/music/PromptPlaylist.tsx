'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Save, Play } from 'lucide-react';
import type { CatalogTrack } from '@/lib/data/queries';
import { apiRequest } from '@/lib/client-api';
import { usePlayer } from '@/lib/player-store';
import { readDiscoveryExclusions } from '@/lib/discovery-preferences';
import type { Playlist } from '@ai-music/contracts';
import { slugify } from '@/lib/links';

export function PromptPlaylist({ locale, viewerId }: {
  locale: 'ar' | 'en';
  viewerId: string | null;
}) {
  const ar = locale === 'ar';
  const [prompt, setPrompt] = useState('');
  const [tracks, setTracks] = useState<CatalogTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const play = usePlayer((state) => state.play);

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setTracks([]);
    setMessage('');
    try {
      const result = await apiRequest<{ tracks: CatalogTrack[]; matched: boolean }>(
        '/api/discovery/prompt',
        { method: 'POST', body: JSON.stringify({ prompt: prompt.trim() }) },
      );
      const prefs = readDiscoveryExclusions(viewerId);
      const filtered = result.tracks.filter((track) =>
        !prefs.trackIds.includes(track.id) &&
        !(track.genreIds?.length ? track.genreIds : [track.genreId])
          .some((id) => prefs.genreIds.includes(id)),
      );
      setTracks(filtered);
      if (!filtered.length) setMessage(ar
        ? 'الوصف ده مش مرتبط بأغاني متاحة حاليًا. جرّب نوع موسيقى أو مود أو لغة.'
        : 'No playable music matches that description yet. Try a genre, mood or language.');
    } catch {
      setMessage(ar ? 'حصلت مشكلة في إعداد الاختيارات.' : 'Could not prepare your mix.');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!viewerId || !tracks.length || saving) return;
    setSaving(true);
    setMessage('');
    let created: Playlist | null = null;
    let saved = 0;
    try {
      const response = await apiRequest<{ playlist: Playlist }>('/api/playlists', {
        method: 'POST',
        body: JSON.stringify({
          title: prompt.trim().slice(0, 100),
          description: (ar ? 'قائمة مقترحة من Oddio حسب الوصف: ' : 'Oddio suggested mix for: ') + prompt.trim(),
          visibility: 'private',
        }),
      });
      created = response.playlist;
      for (const track of tracks) {
        try {
          await apiRequest(`/api/playlists/${created.id}/tracks`, {
            method: 'POST',
            body: JSON.stringify({ trackId: track.id }),
          });
          saved += 1;
        } catch {
          // Leave the private list intact and explain partial saves explicitly.
        }
      }
      if (saved === tracks.length) {
        window.location.assign(`/${locale}/playlists/${created.id}-${slugify(created.title)}`);
      } else {
        setMessage(ar
          ? `اتحفظت ${saved} من ${tracks.length} أغنية. القائمة خاصة وتقدر تفتحها من المكتبة.`
          : `Saved ${saved} of ${tracks.length} songs. The private playlist is in your library.`);
      }
    } catch {
      setMessage(ar ? 'مش قادر أحفظ القائمة دلوقتي.' : 'Could not save the playlist.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="oddio-dashboard-section mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6"
      aria-label={ar ? 'أنشئ قائمة موسيقى من وصف' : 'Create a playlist from a description'}>
      <p className="oddio-micro-label"><Sparkles size={14} /> ODDIO MIX MAKER</p>
      <h2 className="mb-2 text-xl font-bold text-ink">
        {ar ? 'اكتب الموسيقى اللي في بالك' : 'Describe the music you want'}
      </h2>
      <p className="mb-4 text-sm text-muted">
        {ar ? 'مثلاً: أغاني عربية هادية، أو روك حماسي. الاختيارات حسب البيانات المتاحة، من غير AI مدفوع.'
          : 'Try “calm Arabic music” or “energetic rock”. Matches catalog tags without a paid AI model.'}
      </p>
      <form onSubmit={(event) => void generate(event)} className="flex flex-wrap gap-2">
        <label htmlFor="oddio-mix-prompt" className="sr-only">{ar ? 'وصف الموسيقى' : 'Music description'}</label>
        <input
          id="oddio-mix-prompt"
          type="text"
          className="input min-h-11 min-w-0 flex-1 basis-52"
          minLength={3}
          maxLength={240}
          required
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={ar ? 'مزيكا عربية هادية...' : 'Chill Arabic pop...'}
        />
        <button type="submit" disabled={loading}
          className="min-h-11 rounded-full bg-primary px-5 text-sm font-bold text-background disabled:opacity-60">
          {loading ? (ar ? 'بندور...' : 'Finding...') : (ar ? 'كوّن القائمة' : 'Create mix')}
        </button>
      </form>
      {message ? <p role="status" className="mt-3 text-sm text-muted">{message}</p> : null}
      {tracks.length > 0 ? (
        <div className="mt-5">
          <p className="mb-3 text-sm text-muted">
            {ar ? `${tracks.length} أغنية مناسبة` : `${tracks.length} matching songs`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => play(tracks[0]!, tracks.slice(1))}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/40 px-4 text-sm font-semibold text-primary">
              <Play size={16} /> {ar ? 'اسمع القائمة' : 'Play mix'}
            </button>
            {viewerId ? (
              <button type="button" disabled={saving} onClick={() => void save()}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold text-ink disabled:opacity-60">
                <Save size={16} /> {saving ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'احفظ Playlist خاصة' : 'Save private playlist')}
              </button>
            ) : (
              <Link href={`/${locale}/login?next=${encodeURIComponent('/' + locale + '/discover')}`}
                className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-4 text-sm text-ink">
                {ar ? 'سجّل دخولك عشان تحفظ' : 'Sign in to save'}
              </Link>
            )}
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {tracks.map((track) => (
              <li key={track.id} className="truncate rounded-lg border border-white/10 px-3 py-2 text-sm text-ink">
                {track.title} <span className="text-muted">· {track.artist?.name ?? ''}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
