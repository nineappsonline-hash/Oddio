'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import type { CatalogTrack } from '@/lib/data/queries';
import { TrackRow } from '@/components/music/TrackRow';
import { DragReorderList } from '@/components/ui/DragReorderList';
import { apiRequest } from '@/lib/client-api';
import { moveItem } from '@/lib/reorder-items';

export function PlaylistReorderableTracks({
  playlistId,
  initialTracks,
  locale,
}: {
  playlistId: string;
  initialTracks: CatalogTrack[];
  locale: Locale;
}) {
  const [tracks, setTracks] = useState(initialTracks);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const router = useRouter();
  const ar = locale === 'ar';

  const selectedTracks = tracks.filter((track) => selected.includes(track.id));
  const allSelected = tracks.length > 0 && tracks.every((track) => selected.includes(track.id));

  const toggleSelection = (id: string) => setSelected((current) =>
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
  );
  const toggleAll = () => setSelected((current) =>
    allSelected ? [] : tracks.map((track) => track.id),
  );

  async function removeSelected() {
    if (saving || needsRefresh || selectedTracks.length === 0) return;
    const targets = [...selectedTracks];
    setSaving(true);
    setMessage(ar ? 'جاري حذف الأغاني المختارة…' : 'Removing selected tracks…');
    let removed = 0;
    try {
      // Existing endpoint checks the user's edit permissions on every request.
      // Sequential removal avoids racing individual position updates.
      for (const track of targets) {
        await apiRequest(
          `/api/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(track.id)}`,
          { method: 'DELETE' },
        );
        removed += 1;
      }
      setTracks((current) => current.filter((track) => !selected.includes(track.id)));
      setSelected([]);
      setConfirmingRemove(false);
      setMessage(ar ? `اتحذفت ${removed} أغنية من القائمة.` : `Removed ${removed} tracks from playlist.`);
      router.refresh();
    } catch {
      setConfirmingRemove(false);
      setNeedsRefresh(true);
      setMessage(ar
        ? `اتحذفت ${removed} من ${targets.length} أغنية. حدّث القائمة علشان تعرض الحالة الصحيحة قبل أي تعديل تاني.`
        : `Removed ${removed} of ${targets.length} tracks. Reload to verify the playlist before editing further.`);
      // Never blindly retry a partially successful multi-request mutation.
    } finally {
      setSaving(false);
    }
  }

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
      setMessage(
        error instanceof Error
          ? error.message
          : ar
            ? 'تعذر حفظ الترتيب'
            : 'Could not save order',
      );
      // Block additional edits until authoritative state is loaded again.
      setNeedsRefresh(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs leading-6 text-muted">
        {ar
          ? 'اسحب علامة الترتيب جنب الأغنية لمكانها الجديد. تقدر تستخدم أسهم الكيبورد كمان.'
          : 'Drag the handle beside a track to move it. Arrow keys also work.'}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={saving || needsRefresh || tracks.length === 0}
          onClick={toggleAll}
          className="min-h-10 rounded-full border border-white/20 px-3 text-xs text-ink hover:bg-white/10 disabled:opacity-40"
        >
          {allSelected
            ? ar ? 'إلغاء تحديد الكل' : 'Deselect all'
            : ar ? 'حدد كل الأغاني' : 'Select all'}
        </button>
        {selectedTracks.length > 0 ? (
          <>
            <button
              type="button"
              disabled={saving || needsRefresh}
              onClick={() => setConfirmingRemove(true)}
              className="min-h-10 rounded-full border border-red-400/50 px-4 text-xs font-semibold text-red-300 hover:bg-red-400/10 disabled:opacity-40"
            >
              {ar ? `احذف ${selectedTracks.length} من القائمة` : `Remove ${selectedTracks.length} from playlist`}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => { setSelected([]); setConfirmingRemove(false); }}
              className="min-h-10 rounded-full px-3 text-xs text-muted hover:text-ink"
            >
              {ar ? 'امسح التحديد' : 'Clear selection'}
            </button>
          </>
        ) : null}
      </div>
      {confirmingRemove && selectedTracks.length > 0 ? (
        <div role="group" aria-label={ar ? 'تأكيد الحذف' : 'Confirm removal'}
          className="space-y-3 rounded-xl border border-red-400/35 bg-red-400/5 p-4">
          <p className="text-sm font-medium text-ink">
            {ar
              ? `متأكد إنك عاوز تشيل ${selectedTracks.length} أغنية من الـPlaylist؟ الأغاني نفسها مش هتتمسح من Oddio.`
              : `Remove ${selectedTracks.length} tracks from this playlist? The songs will remain on Oddio.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={saving} onClick={() => void removeSelected()}
              className="min-h-10 rounded-full bg-red-600 px-4 text-xs font-bold text-white disabled:opacity-50">
              {saving ? (ar ? 'جاري الحذف…' : 'Removing…') : (ar ? 'تأكيد الحذف' : 'Confirm remove')}
            </button>
            <button type="button" disabled={saving} onClick={() => setConfirmingRemove(false)}
              className="min-h-10 rounded-full border border-white/20 px-4 text-xs text-ink disabled:opacity-50">
              {ar ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex min-h-8 flex-wrap items-center gap-3">
        <p role="status" aria-live="polite" className="text-xs text-muted">
          {message}
        </p>
        {needsRefresh ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-10 rounded-lg border border-primary/40 px-3 text-xs font-semibold text-ink transition-colors hover:bg-primary/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {ar ? 'حدّث القائمة وحاول تاني' : 'Reload list and try again'}
          </button>
        ) : null}
      </div>
      <DragReorderList
        items={tracks}
        getId={(track) => track.id}
        locale={locale}
        disabled={saving || needsRefresh}
        onMove={(from, to) => void reorder(from, to)}
        className="card divide-y divide-white/5 p-2"
        renderItem={(track, index) => (
          <div className="flex min-w-0 items-center gap-1">
            <label className="flex min-h-11 min-w-11 shrink-0 items-center justify-center">
              <input
                type="checkbox"
                checked={selected.includes(track.id)}
                onChange={() => { toggleSelection(track.id); setConfirmingRemove(false); }}
                disabled={saving || needsRefresh}
                aria-label={ar ? `حدد ${track.title}` : `Select ${track.title}`}
                className="h-4 w-4 accent-primary"
              />
            </label>
            <div className="min-w-0 flex-1">
              <TrackRow track={track} queue={tracks} index={index} locale={locale} />
            </div>
          </div>
        )}
      />
    </div>
  );
}
