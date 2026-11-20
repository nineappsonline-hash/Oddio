'use client';

import { useState } from 'react';
import { ListPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePlayer } from '@/lib/player-store';
import { apiRequest } from '@/lib/client-api';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useLocalePath, loginHref } from '@/lib/use-locale-path';
import { Modal } from '@/components/ui/Modal';

export function SaveQueueAsPlaylist() {
  const queue = usePlayer((state) => state.queue);
  const { user } = useSession();
  const { locale, pathname } = useLocalePath();
  const rtl = locale === 'ar';
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const [savedPlaylistId, setSavedPlaylistId] = useState<string | null>(null);

  const start = () => {
    if (!user) {
      router.push(loginHref(locale, pathname));
      return;
    }
    setTitle('');
    setVisibility('private');
    setError('');
    setSavedCount(0);
    setSavedPlaylistId(null);
    setOpen(true);
  };

  const save = async () => {
    const name = title.trim();
    if (!name || saving || !queue.length) return;
    // Capture current order once: queue may change while requests are running.
    const trackIds = [...new Set(queue.map((track) => track.id))];
    setSaving(true);
    setError('');
    setSavedCount(0);
    let playlistId = savedPlaylistId;
    let added = 0;
    try {
      if (!playlistId) {
        const response = await apiRequest<{ playlist: { id: string } }>('/api/playlists', {
          method: 'POST',
          body: JSON.stringify({ title: name, description: '', visibility }),
        });
        playlistId = response.playlist.id;
        setSavedPlaylistId(playlistId);
      }
      // Sequential additions preserve exact queue order with the existing API.
      // If a partial failure occurs, stop and link to the created playlist instead
      // of blindly retrying and potentially duplicating already-added tracks.
      for (const trackId of trackIds) {
        await apiRequest(`/api/playlists/${playlistId}/tracks`, {
          method: 'POST',
          body: JSON.stringify({ trackId }),
        });
        added += 1;
        setSavedCount(added);
      }
      toast(rtl ? 'تم حفظ قائمة الانتظار' : 'Queue saved as a playlist', 'success');
      setOpen(false);
      router.push(`/${locale}/playlists/${playlistId}`);
    } catch {
      setError(
        playlistId
          ? rtl
            ? 'القائمة اتعملت، بس إضافة بعض الأغاني فشلت. افتح القائمة وشوف الأغاني اللي اتحفظت.'
            : 'The playlist was created, but some tracks could not be added. Open it to review what saved.'
          : rtl
            ? 'تعذّر إنشاء القائمة. حاول تاني.'
            : 'Could not create the playlist. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={queue.length === 0}
        onClick={start}
        className="flex min-h-10 items-center gap-1 rounded-full px-3 text-xs font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"
        aria-label={rtl ? 'احفظ قائمة الانتظار كقائمة تشغيل' : 'Save queue as playlist'}
      >
        <ListPlus aria-hidden="true" className="h-4 w-4" />
        <span>{rtl ? 'احفظ القائمة' : 'Save queue'}</span>
      </button>
      <Modal
        open={open}
        onClose={() => { if (!saving) setOpen(false); }}
        title={rtl ? 'احفظ الأغاني في قائمة تشغيل' : 'Save queue as playlist'}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {rtl
              ? `هيتم حفظ ${queue.length} أغنية من قائمة الانتظار، من غير الأغنية اللي شغالة دلوقتي.`
              : `Save ${queue.length} upcoming tracks, excluding the one currently playing.`}
          </p>
          {!savedPlaylistId ? (
            <>
              <label className="block text-sm font-medium text-ink" htmlFor="oddio-queue-playlist-title">
                {rtl ? 'اسم القائمة' : 'Playlist name'}
              </label>
              <input
                id="oddio-queue-playlist-title"
                value={title}
                maxLength={120}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={rtl ? 'قائمتي الجديدة' : 'My queue'}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-ink outline-none focus:border-primary"
              />
              <label className="block text-sm font-medium text-ink" htmlFor="oddio-queue-playlist-visibility">
                {rtl ? 'الخصوصية' : 'Visibility'}
              </label>
              <select
                id="oddio-queue-playlist-visibility"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}
                className="w-full rounded-xl border border-white/20 bg-[#28212f] px-3 py-2.5 text-ink focus:border-primary"
              >
                <option value="private">{rtl ? 'خاصة' : 'Private'}</option>
                <option value="public">{rtl ? 'عامة' : 'Public'}</option>
              </select>
            </>
          ) : null}
          {saving ? <p role="status" className="text-xs text-muted">
            {rtl ? `تمت إضافة ${savedCount} أغنية…` : `Added ${savedCount} tracks…`}
          </p> : null}
          {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
          {savedPlaylistId && error ? (
            <button
              type="button"
              className="rounded-full border border-primary px-4 py-2 text-sm text-primary"
              onClick={() => router.push(`/${locale}/playlists/${savedPlaylistId}`)}
            >
              {rtl ? 'افتح القائمة' : 'Open playlist'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !title.trim() || Boolean(savedPlaylistId)}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-black disabled:opacity-50"
          >
            {saving ? (rtl ? 'جاري الحفظ…' : 'Saving…') : rtl ? 'احفظ' : 'Save'}
          </button>
        </div>
      </Modal>
    </>
  );
}
