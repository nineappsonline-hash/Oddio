'use client';

import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '@/lib/player-store';
import { formatDuration } from '@/lib/utils';

// Only visible rows request media metadata, at most two at a time.
// The cache keeps sorting, scrolling and revisiting pages inexpensive.
const cache = new Map<string, number>();
const pending = new Map<string, Promise<number>>();
const jobs: Array<() => void> = [];
let active = 0;

function pump() {
  while (active < 2 && jobs.length > 0) {
    const job = jobs.shift();
    if (!job) return;
    active++;
    job();
  }
}

function audioDuration(trackId: string): Promise<number> {
  const cached = cache.get(trackId);
  if (cached) return Promise.resolve(cached);
  const existing = pending.get(trackId);
  if (existing) return existing;

  const promise = new Promise<number>((resolve) => {
    jobs.push(() => {
      const audio = new Audio();
      let finished = false;
      const finish = (seconds: number) => {
        if (finished) return;
        finished = true;
        window.clearTimeout(timer);
        audio.removeAttribute('src');
        audio.load();
        active--;
        pump();
        resolve(seconds);
      };
      const onMetadata = () => {
        if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
        const seconds = audio.duration;
        if (seconds > 0 && seconds <= 60 * 60 * 4) {
          cache.set(trackId, seconds);
          finish(seconds);
        }
      };
      const timer = window.setTimeout(() => finish(0), 15000);
      audio.preload = 'metadata';
      audio.addEventListener('loadedmetadata', onMetadata);
      audio.addEventListener('durationchange', onMetadata);
      audio.addEventListener('error', () => finish(0));
      audio.src = `/api/tracks/${encodeURIComponent(trackId)}/duration-source`;
      audio.load();
    });
    pump();
  }).finally(() => pending.delete(trackId));
  pending.set(trackId, promise);
  return promise;
}

export function TrackDuration({
  trackId,
  durationMs,
}: {
  trackId: string;
  durationMs: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [measured, setMeasured] = useState<number>(() => cache.get(trackId) ?? 0);
  const playingTrackId = usePlayer((state) => state.track?.id);
  const playerDuration = usePlayer((state) => state.duration);

  useEffect(() => {
    if (durationMs > 0) return;
    let alive = true;
    const node = ref.current;
    if (!node) return;

    const load = () => {
      void audioDuration(trackId).then((seconds) => {
        if (alive && seconds > 0) setMeasured(seconds);
      });
    };

    if (typeof IntersectionObserver === 'undefined') {
      load();
      return () => { alive = false; };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: '180px' },
    );
    observer.observe(node);
    return () => { alive = false; observer.disconnect(); };
  }, [trackId, durationMs]);

  const liveMs =
    playingTrackId === trackId && Number.isFinite(playerDuration) && playerDuration > 0
      ? playerDuration * 1000
      : 0;
  const value = durationMs > 0 ? durationMs : measured > 0 ? measured * 1000 : liveMs;
  return (
    <span ref={ref} className="inline-block min-w-10 text-end" aria-label={value > 0 ? undefined : 'Duration not yet available'}>
      {value > 0 ? formatDuration(value) : '—'}
    </span>
  );
}
