'use client';

import dynamic from 'next/dynamic';
import { usePlayer } from '@/lib/player-store';

// The full player contains lyrics, timed comments, recommendations, and
// playlists. Visitors browsing without a selected track shouldn't download
// all of that code. The playback engine and mini player remain mounted.
const FullPlayer = dynamic(
  () => import('@/components/player/FullPlayer').then((module) => module.FullPlayer),
  { ssr: false },
);

export function DeferredFullPlayer() {
  const hasTrack = usePlayer((state) => Boolean(state.track));
  return hasTrack ? <FullPlayer /> : null;
}
