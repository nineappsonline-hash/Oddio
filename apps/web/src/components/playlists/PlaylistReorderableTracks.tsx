'use client';

import { useState } from 'react';
import type { Locale } from '@ai-music/contracts';
import type { CatalogTrack } from '@/lib/data/queries';
import { TrackRow } from '@/components/music/TrackRow';
import { DragReorderList } from '@/components/ui/DragReorderList';
import { apiRequest } from '@/lib/client-api';
import { moveItem } from '@/lib/reorder-items';

export function PlaylistReorderableTracks({
  playlistId, initialTracks, locale,
}: { playlistId: string; initialTracks: CatalogTrack[]; locale: Locale }) {
  const [tracks, setTracks] = useState(initialTracks);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const ar = locale === 'ar';

  async function reorder(from: number, to: number) {
    if (saving || from === to || to < 0 || to >= tracks.length) return;
    const next = moveItem(tracks, from, to);
    setTracks(next);
    setSaving(true);
    setMessage(ar ? 'جاري حفظ الترتيب…' : 'Saving order…');
    try {
      await apiRequest(`/api/playlists/${encodeURIComponent(playlistId)}/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({
          trackIds: next.map((track) => track.id),
          expectedTrackIds: tracks.map((track) => track.id),
        }),
      });
      setMessage(ar ? 'اتحفظ الترتيب الجديد' : 'Order saved');
    } catch (error) {
      setTracks(tracks);
      setMessage(error instanceof Error ? error.message : (ar ? 'تعذر حفظ الترتيب' : 'Could not save order'));
      // The server may have changed while this page was open; reload it before retrying.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs leading-6 text-muted">
        {ar ? 'اسحب علامة الترتيب جنب الأغنية لمكانها الجديد. تقدر تستخدم أسهم الكيبورد كمان.'
          : 'Drag the handle beside a track to move it. Arrow keys also work.'}
      </p>
      <p role="status" aria-live="polite" className="min-h-5 text-xs text-muted">{message}</p>
      <DragReorderList items={tracks} getId={(track) => track.id}
        locale={locale} disabled={saving} onMove={(from, to) => void reorder(from, to)}
        className="card divide-y divide-white/5 p-2"
        renderItem={(track, index) => (
          <TrackRow track={track} queue={tracks} index={index} locale={locale} />
        )}
      />
    </div>
  );
}
