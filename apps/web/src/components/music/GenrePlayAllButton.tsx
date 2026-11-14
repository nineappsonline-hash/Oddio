'use client';

import { Play } from 'lucide-react';
import type { CatalogTrack } from '@/lib/data/queries';
import { usePlayer } from '@/lib/player-store';

export function GenrePlayAllButton({
  tracks,
  ar,
}: {
  tracks: CatalogTrack[];
  ar: boolean;
}) {
  const play = usePlayer((state) => state.play);
  return (
    <button
      type="button"
      disabled={!tracks.length}
      onClick={() => {
        const first = tracks[0];
        if (first) play(first, tracks);
      }}
      className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-black shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Play size={17} fill="currentColor" aria-hidden="true" />
      {ar ? 'تشغيل الكل' : 'Play all'}
    </button>
  );
}
