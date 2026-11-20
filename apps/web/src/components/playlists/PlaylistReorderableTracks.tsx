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
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const ar = locale === 'ar';

  async function reorder(from: number, to: number) {
    if (saving || needsRefresh || from === to || to < 0 || to >= tracks.length) return;
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
      setNeedsRefresh(false);
    } catch (error) {
      setTracks(tracks);
      setMessage(error instanceof Error ? error.message : (ar ? 'تعذر حفظ الترتيب' : 'Could not save order'));
      // Block additional edits until authoritative state is loaded again.
      setNeedsRefresh(true);
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
      <div className="flex min-h-8 flex-wrap items-center gap-3">
        <p role="status" aria-live="polite" className="text-xs text-muted">{message}</p>
        {needsRefresh ? (
          <button type="button" onClick={() => window.location.reload()}
            className="min-h-10 rounded-lg border border-primary/40 px-3 text-xs font-semibold text-ink transition-colors hover:bg-primary/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            {ar ? 'حدّث القائمة وحاول تاني' : 'Reload list and try again'}
          </button>
        ) : null}
      </div>
      <DragReorderList items={tracks} getId={(track) => track.id}
        locale={locale} disabled={saving || needsRefresh} onMove={(from, to) => void reorder(from, to)}
        className="card divide-y divide-white/5 p-2"
        renderItem={(track, index) => (
          <TrackRow track={track} queue={tracks} index={index} locale={locale} />
        )}
      />
    </div>
  );
}
