'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { usePlayer } from '@/lib/player-store';

// The full player contains lyrics, timed comments, recommendations, and
// playlists. Visitors browsing without a selected track shouldn't download
// all of that code. The playback engine and mini player remain mounted.
const FullPlayer = dynamic(
  () => import('@/components/player/FullPlayer').then((module) => module.FullPlayer),
  { ssr: false },
);

type ConnectionNavigator = Navigator & {
  connection?: { effectiveType?: string; saveData?: boolean; downlink?: number };
};

let preloaded = false;

export function DeferredFullPlayer() {
  const shouldShow = usePlayer((state) => Boolean(state.track && state.expanded));
  const playbackReady = usePlayer(
    (state) =>
      !!state.track &&
      state.isPlaying &&
      state.currentTime > 0 &&
      !state.buffering &&
      !state.error,
  );

  useEffect(() => {
    if (!playbackReady || shouldShow || preloaded) return;
    const connection = (navigator as ConnectionNavigator).connection;
    if (
      connection?.saveData ||
      (connection?.effectiveType && connection.effectiveType !== '4g') ||
      (connection?.downlink != null && connection.downlink < 1.5)
    ) {
      return;
    }
    // Let playback take priority. Warm the code only after a listener starts a
    // track and the browser can afford it. Direct expansion always keeps
    // its own on-demand path, regardless of preload eligibility.
    const preload = () => {
      preloaded = true;
      void import('@/components/player/FullPlayer').catch(() => {
        preloaded = false;
      });
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(preload);
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(preload, 250);
    return () => window.clearTimeout(id);
  }, [playbackReady, shouldShow]);

  return shouldShow ? <FullPlayer /> : null;
}
