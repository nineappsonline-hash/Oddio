'use client';

import { useMemo, useState } from 'react';
import type { CatalogTrack } from '@/lib/data/queries';
import { TrackRow } from '@/components/music/TrackRow';

export function SearchableLikedTracks({
  tracks,
  locale,
}: {
  tracks: CatalogTrack[];
  locale: 'ar' | 'en';
}) {
  const [query, setQuery] = useState('');
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
            <TrackRow
              key={track.id}
              track={track}
              queue={shown}
              index={index}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
