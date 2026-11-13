'use client';

import { create } from 'zustand';
import type { CatalogTrack } from '@/lib/data/queries';

export type RepeatMode = 'off' | 'one' | 'all';

interface PlayerState {
  track: CatalogTrack | null;
  queue: CatalogTrack[];
  history: CatalogTrack[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  autoplay: boolean;
  expanded: boolean;
  error: string | null;
  buffering: boolean;
  seekRequest: { seconds: number; nonce: number } | null;
  playbackRequestId: number;
  retryPlayback: () => void;
  play: (track: CatalogTrack, upcoming?: CatalogTrack[]) => void;
  toggle: () => void;
  setPlaying: (playing: boolean) => void;
  next: (automatic?: boolean) => boolean;
  previous: () => boolean;
  advance: () => boolean;
  seek: (seconds: number) => void;
  setCurrentTime: (seconds: number) => void;
  setDuration: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  toggleAutoplay: () => void;
  addToQueue: (track: CatalogTrack) => void;
  playNextInQueue: (track: CatalogTrack) => void;
  removeFromQueue: (trackId: string) => void;
  jumpTo: (trackId: string) => void;
  clearQueue: () => void;
  setExpanded: (expanded: boolean) => void;
  setError: (error: string | null) => void;
  setBuffering: (buffering: boolean) => void;
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = temp;
  }
  return copy;
}

export const usePlayer = create<PlayerState>((set, get) => ({
  track: null,
  queue: [],
  history: [],
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  repeat: 'off',
  shuffle: false,
  autoplay: true,
  expanded: false,
  error: null,
  buffering: false,
  seekRequest: null,
  playbackRequestId: 0,

  retryPlayback: () =>
    set((state) =>
      state.track
        ? {
            playbackRequestId: state.playbackRequestId + 1,
            error: null,
            buffering: true,
            isPlaying: true,
          }
        : state,
    ),

  play: (track, upcoming = []) => {
    const state = get();
    if (state.track?.id === track.id) {
      set({
        isPlaying: true,
        currentTime: 0,
        seekRequest: { seconds: 0, nonce: (state.seekRequest?.nonce ?? 0) + 1 },
        error: null,
      });
      return;
    }
    const list = state.shuffle ? shuffleArray(upcoming) : upcoming;
    set({
      track,
      queue: list.filter((item) => item.id !== track.id),
      history: [],
      isPlaying: true,
      currentTime: 0,
      duration: track.durationMs / 1000,
      error: null,
    });
  },
  toggle: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (seconds) => set({ currentTime: seconds }),
  setDuration: (seconds) => set({ duration: seconds }),
  setVolume: (volume) =>
    set({ volume: Math.min(1, Math.max(0, volume)), muted: volume === 0 }),
  toggleMute: () => set((state) => ({ muted: !state.muted })),
  setExpanded: (expanded) => set({ expanded }),
  setError: (error) => set({ error, isPlaying: error ? false : get().isPlaying }),
  setBuffering: (buffering) => set({ buffering }),

  next: () => {
    const state = get();
    if (state.queue.length === 0) {
      if (state.repeat === 'all' && state.history.length > 0) {
        const upcoming = [...state.history];
        const [first, ...rest] = upcoming;
        if (first) {
          set({
            track: first,
            queue: rest,
            history: state.track ? [state.track] : [],
            currentTime: 0,
            duration: first.durationMs / 1000,
            isPlaying: true,
            error: null,
          });
          return true;
        }
      }
      set({ isPlaying: false });
      get().seek(0);
      return false;
    }
    const [first, ...rest] = state.queue;
    if (!first) return false;
    set({
      track: first,
      queue: rest,
      history: state.track ? [...state.history, state.track] : state.history,
      currentTime: 0,
      duration: first.durationMs / 1000,
      isPlaying: true,
      error: null,
    });
    return true;
  },

  previous: () => {
    const state = get();
    if (state.currentTime > 4) {
      get().seek(0);
      return false;
    }
    const history = [...state.history];
    const previous = history.pop();
    if (!previous) {
      get().seek(0);
      return false;
    }
    set({
      track: previous,
      history,
      queue: state.track ? [state.track, ...state.queue] : state.queue,
      currentTime: 0,
      duration: previous.durationMs / 1000,
      isPlaying: true,
      error: null,
    });
    return true;
  },

  advance: () => {
    const state = get();
    if (state.repeat === 'one') {
      get().seek(0);
      set({ isPlaying: true });
      return true;
    }
    if (state.queue.length > 0) return state.next();
    if (state.repeat === 'all' && state.history.length > 0) return state.next();
    set({ isPlaying: false });
    get().seek(0);
    return false;
  },

  seek: (seconds) =>
    set((state) => ({
      currentTime: seconds,
      seekRequest: { seconds, nonce: (state.seekRequest?.nonce ?? 0) + 1 },
    })),

  cycleRepeat: () =>
    set((state) => ({
      repeat: state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off',
    })),

  toggleShuffle: () =>
    set((state) => ({
      shuffle: !state.shuffle,
      queue: !state.shuffle ? shuffleArray(state.queue) : state.queue,
    })),

  toggleAutoplay: () => set((state) => ({ autoplay: !state.autoplay })),

  addToQueue: (track) =>
    set((state) => {
      if (state.track?.id === track.id) return state;
      if (state.queue.some((item) => item.id === track.id)) return state;
      return { queue: [...state.queue, track] };
    }),

  playNextInQueue: (track) =>
    set((state) =>
      state.track?.id === track.id
        ? state
        : {
            queue: [track, ...state.queue.filter((item) => item.id !== track.id)],
          },
    ),

  removeFromQueue: (trackId) =>
    set((state) => ({ queue: state.queue.filter((item) => item.id !== trackId) })),

  jumpTo: (trackId) =>
    set((state) => {
      const index = state.queue.findIndex((item) => item.id === trackId);
      if (index < 0) return state;
      const selected = state.queue[index];
      if (!selected) return state;
      const remaining = state.queue.filter((item) => item.id !== trackId);
      return {
        track: selected,
        queue: remaining,
        history: state.track ? [...state.history, state.track] : state.history,
        currentTime: 0,
        duration: selected.durationMs / 1000,
        isPlaying: true,
        error: null,
      };
    }),

  clearQueue: () => set({ queue: [] }),
}));
