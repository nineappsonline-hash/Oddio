import { describe, expect, it } from 'vitest';
import { mergePodcastProgress, type SavedPodcastProgress } from './podcast-progress-store';

const entry = (episodeId: string, updatedAt: number, completed = false): SavedPodcastProgress =>
  ({ episodeId, seconds: completed ? 600 : 120, duration: 600, updatedAt, completed });

describe('cloud podcast progress merge', () => {
  it('keeps newer local offline progress over older cloud data', () => {
    expect(mergePodcastProgress([entry('ep', 200)], [entry('ep', 100)]))
      .toEqual([entry('ep', 200)]);
  });
  it('restores newer cloud progress after signing in on another device', () => {
    expect(mergePodcastProgress([entry('ep', 100)], [entry('ep', 300)]))
      .toEqual([entry('ep', 300)]);
  });
  it('preserves completed tombstones across two devices', () => {
    expect(mergePodcastProgress([entry('ep', 100)], [entry('ep', 200, true)]))
      .toEqual([entry('ep', 200, true)]);
  });
  it('merges distinct episodes sorted newest-first without mutation', () => {
    const local = [entry('a', 100)];
    const cloud = [entry('b', 200)];
    expect(mergePodcastProgress(local, cloud).map((row) => row.episodeId)).toEqual(['b', 'a']);
    expect(local.map((row) => row.episodeId)).toEqual(['a']);
  });
});
