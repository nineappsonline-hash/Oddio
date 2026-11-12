'use client';

import { useEffect, useState } from 'react';
import { ListPlus, Plus, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Playlist } from '@ai-music/contracts';
import { apiRequest } from '@/lib/client-api';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { loginHref, useLocalePath } from '@/lib/use-locale-path';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export function AddToPlaylistButton({
  trackId,
  playlistId,
  label = 'Add to playlist',
}: {
  trackId: string;
  playlistId?: string;
  label?: string;
}) {
  const { user } = useSession();
  const { locale, pathname } = useLocalePath();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiRequest<{ playlists: Playlist[] }>('/api/playlists')
      .then((result) => setPlaylists(result.playlists))
      .catch(() => toast('Could not load playlists.', 'error'))
      .finally(() => setLoading(false));
  }, [open, toast]);

  function onClick() {
    if (!user) {
      router.push(loginHref(locale, pathname));
      return;
    }
    if (playlistId) {
      addTo(playlistId);
      return;
    }
    setOpen(true);
  }

  async function addTo(id: string) {
    try {
      await apiRequest(`/api/playlists/${id}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ trackId }),
      });
      toast('Added to playlist', 'success');
      setOpen(false);
    } catch {
      toast('Could not add to playlist.', 'error');
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={onClick}>
        <ListPlus className="h-4 w-4" />
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add to playlist">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : playlists.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">You have no playlists yet.</p>
            <Button size="sm" onClick={() => router.push(`/${locale}/playlists/new`)}>
              <Plus className="h-4 w-4" />
              Create playlist
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {playlists.map((playlist) => (
              <li key={playlist.id}>
                <button
                  type="button"
                  onClick={() => addTo(playlist.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-start text-sm transition hover:border-primary/40 hover:bg-white/5"
                >
                  <span>
                    <span className="font-medium text-ink">{playlist.title}</span>
                    <span className="ms-2 text-xs text-muted">
                      {playlist.trackIds.length} tracks · {playlist.visibility}
                    </span>
                  </span>
                  {playlist.trackIds.includes(trackId) ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
