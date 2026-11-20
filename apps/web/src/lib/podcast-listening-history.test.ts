import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isVisiblePodcastHistoryEntry,
  mergePodcastProgress,
  readPodcastProgress,
  readPodcastSyncRecords,
  setPodcastEpisodePlayed,
} from './podcast-progress-store';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear() { data.clear(); },
    getItem(key) { return data.get(key) ?? null; },
    key(index) { return [...data.keys()][index] ?? null; },
    removeItem(key) { data.delete(key); },
    setItem(key, value) { data.set(key, value); },
  };
}

describe('podcast listening history actions', () => {
  beforeEach(() => {
    vi.stubGlobal('window', Object.assign(new EventTarget(), {
      localStorage: memoryStorage(),
      sessionStorage: memoryStorage(),
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('marks a never-played episode as completed and syncable', () => {
    expect(setPodcastEpisodePlayed('user-1', 'episode-1', 600, true)).toBe(true);
    const [entry] = readPodcastSyncRecords('user-1');
    expect(entry).toMatchObject({ episodeId: 'episode-1', seconds: 600, duration: 600, completed: true });
    expect(isVisiblePodcastHistoryEntry(entry)).toBe(true);
    expect(readPodcastProgress('user-1')).toEqual([]);
  });

  it('marks an episode unplayed but keeps an explicit cloud-sync record', () => {
    setPodcastEpisodePlayed('user-1', 'episode-1', 600, true);
    expect(setPodcastEpisodePlayed('user-1', 'episode-1', 600, false)).toBe(true);
    const [entry] = readPodcastSyncRecords('user-1');
    expect(entry).toMatchObject({ episodeId: 'episode-1', seconds: 0, completed: false });
    expect(isVisiblePodcastHistoryEntry(entry)).toBe(false);
    expect(readPodcastProgress('user-1')).toEqual([]);
  });

  it('keeps newer status changes above stale cloud progress', () => {
    const previous = { episodeId: 'ep', seconds: 110, duration: 600, updatedAt: Date.now() - 3000, completed: false };
    setPodcastEpisodePlayed('user-1', 'ep', 600, true);
    const local = readPodcastSyncRecords('user-1');
    expect(mergePodcastProgress(local, [previous])[0]?.completed).toBe(true);
  });

  it('keeps accounts separate and guest history session-scoped', () => {
    setPodcastEpisodePlayed('user-1', 'ep', 600, true);
    setPodcastEpisodePlayed(null, 'guest-episode', 450, true);
    expect(readPodcastSyncRecords('user-2')).toEqual([]);
    expect(readPodcastSyncRecords(null).map((row) => row.episodeId)).toEqual(['guest-episode']);
  });

  it('ignores invalid durations and never fabricates history entries', () => {
    expect(setPodcastEpisodePlayed('user-1', 'ep', 0, true)).toBe(false);
    expect(setPodcastEpisodePlayed('user-1', 'ep', Number.POSITIVE_INFINITY, true)).toBe(false);
    expect(readPodcastSyncRecords('user-1')).toEqual([]);
  });
});
