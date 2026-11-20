'use client';

import { useEffect, useState } from 'react';
import type { Playlist } from '@ai-music/contracts';
import { apiRequest } from '@/lib/client-api';
import { useToast } from '@/components/providers/ToastProvider';
import { Modal } from '@/components/ui/Modal';

type Locale = 'ar' | 'en';

/** Adds an explicit selection to a playlist with the existing authorized API.
 * This is deliberately not an atomic bulk mutation: if one request fails, show
 * exactly how many additions completed and allow inspecting the playlist.
 */
export function BulkAddToPlaylistButton({
  trackIds,
  locale,
  onComplete,
}: {
  trackIds: string[];
  locale: Locale;
  onComplete?: () => void;
}) {
  const ar = locale === 'ar';
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [failedPlaylistId, setFailedPlaylistId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    apiRequest<{ playlists: Playlist[] }>('/api/playlists')
      .then(({ playlists }) => { if (active) setPlaylists(playlists); })
      .catch(() => { if (active) setError(ar ? 'مش قادرين نحمّل القوائم.' : 'Unable to load playlists.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, ar]);

  const close = () => { if (!saving) setOpen(false); };
  const start = () => {
    const unique = [...new Set(trackIds)].filter(Boolean);
    if (!unique.length) return;
    setSnapshot(unique);
    setError('');
    setResult('');
    setFailedPlaylistId(null);
    setOpen(true);
  };
  const save = async (playlist: Playlist) => {
    if (saving) return;
    const remaining = snapshot.filter((id) => !playlist.trackIds.includes(id));
    if (!remaining.length) {
      toast(ar ? 'كل الأغاني المختارة موجودة في القائمة بالفعل.' : 'All selected tracks are already in this playlist.', 'success');
      setOpen(false);
      onComplete?.();
      return;
    }
    setSaving(true);
    setError('');
    setResult('');
    let added = 0;
    try {
      for (const trackId of remaining) {
        await apiRequest(`/api/playlists/${encodeURIComponent(playlist.id)}/tracks`, {
          method: 'POST',
          body: JSON.stringify({ trackId }),
        });
        added += 1;
      }
      toast(ar ? `تمت إضافة ${added} أغنية.` : `Added ${added} tracks to playlist.`, 'success');
      setOpen(false);
      onComplete?.();
    } catch {
      setFailedPlaylistId(playlist.id);
      setError(ar
        ? 'بعض الأغاني ما اتحفظتش. راجع القائمة قبل ما تحاول تضيفهم تاني.'
        : 'Some tracks were not saved. Check the playlist before retrying.');
      setResult(ar ? `اتضاف ${added} من ${remaining.length}.` : `Added ${added} of ${remaining.length} tracks.`);
      // Avoid automatic retry: partially completed requests may have committed.
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={trackIds.length === 0}
        className="min-h-10 rounded-full border border-primary/50 px-3 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-40"
      >
        {ar ? `ضيف ${trackIds.length} لقائمة تشغيل` : `Add ${trackIds.length} to playlist`}
      </button>
      <Modal open={open} onClose={close} title={ar ? 'اختار قائمة التشغيل' : 'Choose a playlist'}>
        <div className="space-y-3">
          <p className="text-xs text-muted">
            {ar ? `الأغاني المختارة: ${snapshot.length}` : `Selected tracks: ${snapshot.length}`}
          </p>
          {loading ? <p role="status" className="text-sm text-muted">{ar ? 'جاري التحميل…' : 'Loading…'}</p> : null}
          {saving ? <p role="status" className="text-sm text-muted">{ar ? 'جاري إضافة الأغاني…' : 'Adding tracks…'}</p> : null}
          {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
          {result ? <p role="status" className="text-sm text-muted">{result}</p> : null}
          {failedPlaylistId ? (
            <a
              href={`/${locale}/playlists/${encodeURIComponent(failedPlaylistId)}`}
              className="inline-block text-sm font-semibold text-primary underline"
            >
              {ar ? 'افتح القائمة وراجعها' : 'Open and review playlist'}
            </a>
          ) : null}
          {!loading && playlists.length === 0 && !error ? (
            <p className="text-sm text-muted">{ar ? 'مفيش قوائم متاحة. اعمل قائمة الأول.' : 'No playlists available. Create one first.'}</p>
          ) : null}
          {!loading && !failedPlaylistId ? (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {playlists.map((playlist) => {
                const remaining = snapshot.filter((id) => !playlist.trackIds.includes(id)).length;
                return (
                  <li key={playlist.id}>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void save(playlist)}
                      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-white/15 px-3 py-2 text-start text-sm text-ink hover:border-primary/40 hover:bg-white/5 disabled:opacity-50"
                    >
                      <span className="min-w-0 truncate font-semibold">{playlist.title}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {remaining === 0 ? (ar ? 'موجودة بالفعل' : 'Already added') : ar ? `${remaining} جديدة` : `${remaining} new`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
