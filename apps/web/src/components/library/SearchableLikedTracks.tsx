'use client';

import { useMemo, useState } from 'react';
import { usePlayer } from '@/lib/player-store';
import type { CatalogTrack } from '@/lib/data/queries';
import { TrackRow } from '@/components/music/TrackRow';
import { BulkAddToPlaylistButton } from '@/components/library/BulkAddToPlaylistButton';

export function SearchableLikedTracks({
  tracks,
  locale,
}: {
  tracks: CatalogTrack[];
  locale: 'ar' | 'en';
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const addToQueue = usePlayer((state) => state.addToQueue);
  const shown = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return needle
      ? tracks.filter((track) =>
          [track.title, track.artist?.name ?? '']
            .join(' ')
            .toLocaleLowerCase()
            .includes(needle),
        )
      : tracks;
  }, [tracks, query]);

  const visibleSelected = shown.filter((track) => selected.includes(track.id));
  const allSelected = shown.length > 0 && shown.every((track) => selected.includes(track.id));
  const toggle = (id: string) => setSelected((current) =>
    current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
  );
  const selectAllVisible = () => setSelected((current) => allSelected
    ? current.filter((id) => !shown.some((track) => track.id === id))
    : [...new Set([...current, ...shown.map((track) => track.id)])],
  );
  const addSelected = () => {
    visibleSelected.forEach((track) => addToQueue(track));
    setSelected((current) => current.filter((id) => !visibleSelected.some((track) => track.id === id)));
  };
  return (
    <div className="space-y-3">
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
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={selectAllVisible} disabled={!shown.length}
          className="min-h-10 rounded-full border border-white/20 px-3 text-xs text-ink hover:bg-white/10 disabled:opacity-40">
          {allSelected ? (locale === 'ar' ? 'إلغاء تحديد الظاهر' : 'Deselect visible') : (locale === 'ar' ? 'حدد كل الظاهر' : 'Select visible')}
        </button>
        {visibleSelected.length > 0 ? (
          <button type="button" onClick={addSelected}
            className="min-h-10 rounded-full bg-primary px-4 text-xs font-semibold text-black">
            {locale === 'ar' ? `ضيف ${visibleSelected.length} للانتظار` : `Add ${visibleSelected.length} to queue`}
          </button>
        ) : null}
        {visibleSelected.length > 0 ? (
          <BulkAddToPlaylistButton
            trackIds={visibleSelected.map((track) => track.id)}
            locale={locale}
            onComplete={() => setSelected([])}
          />
        ) : null}
        {selected.length > 0 ? (
          <button type="button" onClick={() => setSelected([])}
            className="min-h-10 rounded-full px-3 text-xs text-muted hover:text-ink">
            {locale === 'ar' ? 'امسح التحديد' : 'Clear selection'}
          </button>
        ) : null}
      </div>
      {query.trim() ? (
        <p className="text-xs text-muted" role="status">
          {locale === 'ar'
            ? `النتائج: ${shown.length} من ${tracks.length}`
            : `Showing ${shown.length} of ${tracks.length}`}
        </p>
      ) : null}
      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-muted">
          {locale === 'ar' ? 'مفيش أغاني مطابقة للبحث.' : 'No liked songs match your search.'}
        </div>
      ) : (
        <div className="card divide-y divide-white/5 p-2">
          {shown.map((track, index) => (
            <div key={track.id} className="flex min-w-0 items-center gap-1">
              <label className="flex min-h-11 min-w-11 shrink-0 items-center justify-center">
                <input type="checkbox" checked={selected.includes(track.id)}
                  onChange={() => toggle(track.id)}
                  aria-label={locale === 'ar' ? `حدد ${track.title}` : `Select ${track.title}`}
                  className="h-4 w-4 accent-primary"
                />
              </label>
              <div className="min-w-0 flex-1">
                <TrackRow track={track} queue={shown} index={index} locale={locale} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
