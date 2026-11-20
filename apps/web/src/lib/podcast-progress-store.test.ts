import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPodcastProgress, readPodcastProgress, savePodcastProgress } from './podcast-progress-store';
import type { CatalogTrack } from '@/lib/data/queries';

function memoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() { return entries.size; },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => { entries.delete(key); },
    setItem: (key, value) => { entries.set(key, value); },
  };
}

const episode = (id: string) => ({
  id, slug: 'oddio-podcast-episode', durationMs: 600_000,
}) as CatalogTrack;

describe('per-episode podcast progress', () => {
  beforeEach(() => {
    vi.stubGlobal('window', Object.assign(new EventTarget(), {
      localStorage: memoryStorage(),
      sessionStorage: memoryStorage(),
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('stores separate episode positions and returns the most recent first', () => {
    savePodcastProgress('listener-a', episode('ep1'), 45, 600);
    savePodcastProgress('listener-a', episode('ep2'), 160, 600);
    expect(readPodcastProgress('listener-a').map((row) => row.episodeId)).toEqual(['ep2', 'ep1']);
    expect(readPodcastProgress('listener-a')[0]?.seconds).toBe(160);
  });

  it('keeps each listener private and guests session-only', () => {
    savePodcastProgress('listener-a', episode('ep1'), 50, 600);
    savePodcastProgress(null, episode('guest-ep'), 60, 600);
    expect(readPodcastProgress('listener-b')).toEqual([]);
    expect(readPodcastProgress(null).map((row) => row.episodeId)).toEqual(['guest-ep']);
  });

  it('clears completed or explicitly restarted episodes', () => {
    savePodcastProgress('listener-a', episode('ep1'), 100, 600);
    savePodcastProgress('listener-a', episode('ep1'), 590, 600);
    expect(readPodcastProgress('listener-a')).toEqual([]);
    savePodcastProgress('listener-a', episode('ep1'), 250, 600);
    clearPodcastProgress('listener-a', 'ep1');
    expect(readPodcastProgress('listener-a')).toEqual([]);
  });

  it('ignores short starts and ordinary music tracks', () => {
    savePodcastProgress('listener-a', episode('ep1'), 5, 600);
    savePodcastProgress('listener-a', { ...episode('song'), slug: 'music' }, 120, 600);
    expect(readPodcastProgress('listener-a')).toEqual([]);
  });

  it('handles malformed storage without affecting playback', () => {
    window.localStorage.setItem('oddio-podcast-progress-v1:listener-a', '{invalid');
    expect(readPodcastProgress('listener-a')).toEqual([]);
    expect(() => savePodcastProgress('listener-a', episode('ep1'), 50, 600)).not.toThrow();
  });
});
