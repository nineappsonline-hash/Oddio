import { describe, expect, it } from 'vitest';
import { createSeedDb, seedIds } from './seed';
import { getRecentHomeTracks } from './home-recent';

describe('home recent listening privacy', () => {
  it('never returns user history to a guest or another signed-in listener', () => {
    const db = createSeedDb();
    db.history.push({
      userId: seedIds.users.listener,
      trackId: seedIds.tracks.cairoDawn,
      playedAt: '2026-11-18T14:00:00.000Z',
    });
    expect(getRecentHomeTracks(db, { userId: null, roles: [] })).toEqual([]);
    expect(getRecentHomeTracks(db, { userId: 'different-user', roles: [] })).toEqual([]);
  });
  it('removes private and inaccessible tracks from playback history', () => {
    const db = createSeedDb();
    db.history.push(
      {
        userId: seedIds.users.listener,
        trackId: seedIds.tracks.cairoDawn,
        playedAt: '2026-11-18T14:00:00.000Z',
      },
      {
        userId: seedIds.users.listener,
        trackId: seedIds.tracks.privateSketch,
        playedAt: '2026-11-19T14:00:00.000Z',
      },
    );
    const recent = getRecentHomeTracks(db, { userId: seedIds.users.listener, roles: [] });
    expect(recent.some((track) => track.id === seedIds.tracks.cairoDawn)).toBe(true);
    expect(recent.some((track) => track.id === seedIds.tracks.privateSketch)).toBe(false);
    expect(recent.every((track) => track.access.listable)).toBe(true);
  });
});
