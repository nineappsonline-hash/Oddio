'use client';

import { Play, Shuffle } from 'lucide-react';
import type { CatalogTrack } from '@/lib/data/queries';
import { usePlayer } from '@/lib/player-store';

export function AlbumPlaybackActions({
  tracks,
  locale,
}: {
  tracks: CatalogTrack[];
  locale: 'ar' | 'en';
}) {
  const play = usePlayer((state) => state.play);
  const ar = locale === 'ar';
  const playable = tracks.filter(
    (track) => track.access.allowed && track.audio?.processingStatus === 'ready',
  );
  const disabled = playable.length === 0;

  const playAlbum = (shuffle: boolean) => {
    if (disabled) return;
    const queue = [...playable];
    if (shuffle) {
      for (let i = queue.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j]!, queue[i]!];
      }
    }
    const first = queue[0];
    if (first) play(first, queue);
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={ar ? 'تشغيل الألبوم' : 'Album playback'}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => playAlbum(false)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-[#211518] transition hover:bg-primary-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play size={18} aria-hidden="true" />
        {ar ? 'تشغيل الألبوم' : 'Play album'}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => playAlbum(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold text-ink transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Shuffle size={18} aria-hidden="true" />
        {ar ? 'تشغيل عشوائي' : 'Shuffle'}
      </button>
    </div>
  );
}
