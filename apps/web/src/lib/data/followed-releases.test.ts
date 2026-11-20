import { describe, expect, it } from 'vitest';
import { createSeedDb, seedIds } from './seed';
import { getFollowedArtistReleases } from './followed-releases';

const listener = { userId: seedIds.users.listener, roles: [] };

describe('followed-artist home releases', () => {
  it('never exposes following to anonymous or another user', () => {
    const db = createSeedDb();
    db.artistFollows.push({
      userId: listener.userId!,
      artistId: seedIds.artists.nova,
      createdAt: '2026-11-19T12:00:00Z',
    });
    expect(getFollowedArtistReleases(db, { userId: null, roles: [] })).toEqual([]);
    expect(getFollowedArtistReleases(db, { userId: 'other-listener', roles: [] })).toEqual([]);
  });

  it('uses follow relationships, sorted newest, and never returns private music', () => {
    const db = createSeedDb();
    db.artistFollows.push({
      userId: listener.userId!,
      artistId: seedIds.artists.nova,
      createdAt: '2026-11-19T12:00:00Z',
    });
    const tracks = getFollowedArtistReleases(db, listener);
    expect(tracks.length).toBeGreaterThan(0);
    expect(tracks.every((track) => track.artistId === seedIds.artists.nova)).toBe(true);
    expect(tracks.every((track) => track.access.listable && track.audio?.processingStatus === 'ready')).toBe(true);
    expect(tracks.every((track, i) => i === 0 || tracks[i - 1]!.releaseAt >= track.releaseAt)).toBe(true);
    expect(tracks.some((track) => track.id === seedIds.tracks.privateSketch)).toBe(false);
  });
});
