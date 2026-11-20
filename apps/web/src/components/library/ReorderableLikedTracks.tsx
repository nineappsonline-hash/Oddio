'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CatalogTrack } from '@/lib/data/queries';
import { TrackRow } from '@/components/music/TrackRow';
import { DragReorderList } from '@/components/ui/DragReorderList';
import { moveItem } from '@/lib/reorder-items';
import { usePlayer } from '@/lib/player-store';
import { BulkAddToPlaylistButton } from '@/components/library/BulkAddToPlaylistButton';

export function ReorderableLikedTracks({
  initialTracks,
  locale,
  userId,
}: {
  initialTracks: CatalogTrack[];
  locale: 'ar' | 'en';
  userId: string;
}) {
  const [tracks, setTracks] = useState(initialTracks);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const addToQueue = usePlayer((state) => state.addToQueue);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return needle
      ? tracks.filter((track) =>
          `${track.title} ${track.artist?.name ?? ''}`
            .toLocaleLowerCase()
            .includes(needle),
        )
      : tracks;
  }, [tracks, query]);
  const selectedVisible = filtered.filter((track) => selected.includes(track.id));
  const allVisibleSelected =
    filtered.length > 0 && filtered.every((track) => selected.includes(track.id));
  const toggleSelected = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  const toggleVisible = () =>
    setSelected((current) =>
      allVisibleSelected
        ? current.filter((id) => !filtered.some((track) => track.id === id))
        : [...new Set([...current, ...filtered.map((track) => track.id)])],
    );
  const queueSelected = () => {
    selectedVisible.forEach((track) => addToQueue(track));
    setSelected((current) =>
      current.filter((id) => !selectedVisible.some((track) => track.id === id)),
    );
  };
  const [ready, setReady] = useState(false);
  const key = `oddio-library-liked-order:${userId}`;
  useEffect(() => {
    setReady(false);
    try {
      const saved = JSON.parse(window.localStorage.getItem(key) ?? '[]') as unknown;
      if (!Array.isArray(saved) || !saved.every((id) => typeof id === 'string')) {
        setTracks(initialTracks);
        return;
      }
      const positions = new Map(saved.map((id, index) => [id, index]));
      setTracks(
        [...initialTracks].sort(
          (a, b) =>
            (positions.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (positions.get(b.id) ?? Number.MAX_SAFE_INTEGER),
        ),
      );
    } catch {
      setTracks(initialTracks);
    } finally {
      setReady(true);
    }
  }, [initialTracks, key]);

  function reorder(from: number, to: number) {
    if (from === to || query.trim()) return;
    const next = moveItem(tracks, from, to);
    setTracks(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next.map((track) => track.id)));
      setMessage(
        locale === 'ar'
          ? 'تم حفظ ترتيب الأغاني على الجهاز'
          : 'Liked song order saved on this device',
      );
    } catch {
      setMessage(
        locale === 'ar'
          ? 'الترتيب اتغير لكن المتصفح رفض حفظه'
          : 'Order changed, but browser storage is unavailable',
      );
    }
  }

  return (
    <div className="space-y-2" data-reorder-ready={ready ? 'true' : 'false'}>
      <label className="block max-w-md text-xs text-muted">
        {locale === 'ar' ? 'ابحث في الأغاني المفضلة' : 'Search liked songs'}
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={locale === 'ar' ? 'اسم الأغنية أو الفنان' : 'Song or artist'}
          className="mt-1 block min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
      </label>
      <p className="text-xs leading-5 text-muted">
        {query.trim()
          ? locale === 'ar'
            ? `النتائج: ${filtered.length} من ${tracks.length} — امسح البحث عشان تقدر تغير الترتيب.`
            : `Showing ${filtered.length} of ${tracks.length} — clear search to reorder.`
          : locale === 'ar'
            ? 'اسحب العلامة بجانب الأغنية لترتيب المفضلة بنفسك. الترتيب بيتحفظ على الجهاز ده.'
            : 'Drag the handle next to a liked song to set a custom order. Saved on this device.'}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!filtered.length}
          onClick={toggleVisible}
          className="min-h-10 rounded-full border border-white/20 px-3 text-xs text-ink hover:bg-white/10 disabled:opacity-40"
        >
          {allVisibleSelected
            ? locale === 'ar'
              ? 'إلغاء تحديد الظاهر'
              : 'Deselect visible'
            : locale === 'ar'
              ? 'حدد كل الظاهر'
              : 'Select visible'}
        </button>
        {selectedVisible.length > 0 ? (
          <>
            <button
              type="button"
              onClick={queueSelected}
              className="min-h-10 rounded-full bg-primary px-4 text-xs font-semibold text-black"
            >
              {locale === 'ar'
                ? `ضيف ${selectedVisible.length} للانتظار`
                : `Add ${selectedVisible.length} to queue`}
            </button>
            <BulkAddToPlaylistButton
              trackIds={selectedVisible.map((track) => track.id)}
              locale={locale}
              onComplete={() => setSelected([])}
            />
          </>
        ) : null}
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={() => setSelected([])}
            className="min-h-10 rounded-full px-3 text-xs text-muted hover:text-ink"
          >
            {locale === 'ar' ? 'امسح التحديد' : 'Clear selection'}
          </button>
        ) : null}
      </div>
      <p className="min-h-4 text-xs text-muted" aria-live="polite" role="status">
        {message}
      </p>
      {filtered.length === 0 ? (
        <p
          role="status"
          className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-muted"
        >
          {locale === 'ar'
            ? 'مفيش أغاني مطابقة للبحث.'
            : 'No liked songs match your search.'}
        </p>
      ) : (
        <DragReorderList
          items={filtered}
          getId={(track) => track.id}
          locale={locale}
          onMove={reorder}
          disabled={!ready || Boolean(query.trim())}
          className="card divide-y divide-white/5 p-2"
          renderItem={(track, index) => (
            <div className="flex min-w-0 items-center gap-1">
              <label className="flex min-h-11 min-w-11 shrink-0 items-center justify-center">
                <input
                  type="checkbox"
                  checked={selected.includes(track.id)}
                  onChange={() => toggleSelected(track.id)}
                  aria-label={
                    locale === 'ar' ? `حدد ${track.title}` : `Select ${track.title}`
                  }
                  className="h-4 w-4 accent-primary"
                />
              </label>
              <div className="min-w-0 flex-1">
                <TrackRow track={track} queue={filtered} index={index} locale={locale} />
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
