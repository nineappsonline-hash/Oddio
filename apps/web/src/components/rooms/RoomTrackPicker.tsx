'use client';

import { useEffect, useState } from 'react';
import type { CatalogTrack, HomeData } from '@/lib/data/queries';
import { apiRequest } from '@/lib/client-api';

export function RoomTrackPicker({
  locale,
  busy,
  onSelect,
}: {
  locale: 'ar' | 'en';
  busy: boolean;
  onSelect: (track: CatalogTrack) => void;
}) {
  const [tracks, setTracks] = useState<CatalogTrack[]>([]);
  useEffect(() => {
    let active = true;
    void apiRequest<HomeData>('/api/home')
      .then((data) => {
        if (!active) return;
        const seen = new Set<string>();
        setTracks(
          [...data.trending, ...data.latest]
            .filter((track) => {
              if (!track.access.listable || seen.has(track.id)) return false;
              seen.add(track.id);
              return true;
            })
            .slice(0, 12),
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  if (!tracks.length) return null;
  return (
    <div className="space-y-2 rounded-xl border border-white/10 p-3">
      <h2 className="text-xs font-bold text-muted">
        {locale === 'ar' ? 'اختار أغنية للغرفة' : 'Choose a track for the room'}
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {tracks.map((track) => (
          <button
            key={track.id}
            type="button"
            disabled={busy}
            className="min-h-11 truncate rounded-xl border border-white/15 px-3 text-start text-sm transition hover:border-primary/50 disabled:opacity-40"
            onClick={() => onSelect(track)}
          >
            {track.title} · {track.artist?.name ?? 'Oddio'}
          </button>
        ))}
      </div>
    </div>
  );
}
