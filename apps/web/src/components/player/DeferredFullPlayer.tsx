'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { usePlayer } from '@/lib/player-store';

// The full player contains lyrics, timed comments, recommendations, and
// playlists. Visitors browsing without a selected track shouldn't download
// all of that code. The playback engine and mini player remain mounted.
type PlayerView = typeof import('@/components/player/FullPlayer').FullPlayer;
let warmedView: PlayerView | null = null;
let preloading = false;

const LazyFullPlayer = dynamic(
  () =>
    import('@/components/player/FullPlayer').then(({ FullPlayer }) => {
      warmedView = FullPlayer;
      return FullPlayer;
    }),
  { ssr: false },
);

type ConnectionNavigator = Navigator & {
  connection?: { effectiveType?: string; saveData?: boolean; downlink?: number };
};

function OpenFullPlayer() {
  // Use the resolved component immediately when it is warm. Pin this choice
  // for the current session so a pending import cannot remount the dialog.
  const [View] = useState(() => warmedView ?? LazyFullPlayer);
  return <View />;
}

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
    if (!playbackReady || shouldShow || warmedView || preloading) return;
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
      if (warmedView || preloading) return;
      preloading = true;
      void import('@/components/player/FullPlayer')
        .then(({ FullPlayer }) => {
          warmedView = FullPlayer;
        })
        .catch(() => {
          // Expansion keeps the original on-demand path if warming fails.
        })
        .finally(() => {
          preloading = false;
        });
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(preload);
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(preload, 250);
    return () => window.clearTimeout(id);
  }, [playbackReady, shouldShow]);

  return shouldShow ? <OpenFullPlayer /> : null;
}
