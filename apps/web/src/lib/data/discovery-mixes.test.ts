import { describe, expect, it } from 'vitest';
import type { DemoDb } from './types';
import { buildDiscoveryMix, rotationKey } from './discovery-mixes';

function fixture(): DemoDb {
  const tracks = [
    {
      id: 'a',
      artistId: 'artist-a',
      genreId: 'pop',
      moodIds: ['chill'],
      qualifiedPlays: 50,
    },
    {
      id: 'b',
      artistId: 'artist-b',
      genreId: 'pop',
      moodIds: ['chill'],
      qualifiedPlays: 40,
    },
    {
      id: 'c',
      artistId: 'artist-c',
      genreId: 'rock',
      moodIds: ['happy'],
      qualifiedPlays: 30,
    },
    {
      id: 'd',
      artistId: 'artist-a',
      genreId: 'pop',
      moodIds: ['happy'],
      qualifiedPlays: 20,
    },
    {
      id: 'e',
      artistId: 'artist-d',
      genreId: 'rock',
      moodIds: ['chill'],
      qualifiedPlays: 10,
    },
  ].map((item) => ({
    ...item,
    title: item.id,
    genreIds: [item.genreId],
    releaseAt: '2026-01-01T00:00:00.000Z',
    visibility: 'public',
    reviewStatus: 'approved',
    publishStatus: 'published',
    audio: { kind: 'rendition', processingStatus: 'ready', objectKey: item.id + '.mp3' },
  }));
  return {
    tracks,
    artists: ['artist-a', 'artist-b', 'artist-c', 'artist-d'].map((id) => ({
      id,
      name: id,
      ownerUserId: 'owner',
    })),
    albums: [],
    genres: [
      { id: 'pop', slug: 'pop', labelEn: 'Pop', labelAr: 'بوب', active: true },
      { id: 'rock', slug: 'rock', labelEn: 'Rock', labelAr: 'روك', active: true },
    ],
    moods: [
      { id: 'chill', slug: 'chill', labelEn: 'Chill', labelAr: 'هادي', active: true },
      { id: 'happy', slug: 'happy', labelEn: 'Happy', labelAr: 'سعيد', active: true },
    ],
    likes: [],
    comments: [],
    playbackSessions: [],
    playbackEvents: [],
  } as unknown as DemoDb;
}

const guest = { userId: null, roles: [] as [] };
const date = new Date('2026-11-15T12:00:00.000Z');

describe('Oddio discovery stations', () => {
  it('rotates daily at midnight UTC and weekly on Monday UTC', () => {
    expect(rotationKey(date, 'daily')).toBe('2026-11-15');
    expect(rotationKey(new Date('2026-11-15T23:59:00Z'), 'weekly')).toBe('2026-11-09');
    expect(rotationKey(new Date('2026-11-16T00:01:00Z'), 'weekly')).toBe('2026-11-16');
  });

  it('keeps a daily mix stable during the same day', () => {
    const one = buildDiscoveryMix(fixture(), guest, { kind: 'daily', now: date });
    const two = buildDiscoveryMix(fixture(), guest, {
      kind: 'daily',
      now: new Date('2026-11-15T23:00:00Z'),
    });
    expect(one.tracks.map((track) => track.id)).toEqual(
      two.tracks.map((track) => track.id),
    );
  });

  it('starts song radio with the selected playable song', () => {
    const result = buildDiscoveryMix(fixture(), guest, {
      kind: 'song',
      seedId: 'b',
      now: date,
    });
    expect(result.tracks[0]?.id).toBe('b');
    expect(new Set(result.tracks.map((track) => track.id)).size).toBe(
      result.tracks.length,
    );
  });

  it('uses the artist identity for Artist Radio, independent of a featured song', () => {
    const db = fixture();
    const station = buildDiscoveryMix(db, guest, {
      kind: 'artist',
      seedId: 'artist-a',
      now: date,
    });
    expect(station.tracks.length).toBeGreaterThan(0);
    expect(station.tracks[0]?.artistId).toBe('artist-a');
    expect(new Set(station.tracks.map((track) => track.id)).size).toBe(
      station.tracks.length,
    );
  });

  it('keeps legacy track-based artist stations working', () => {
    const byArtist = buildDiscoveryMix(fixture(), guest, {
      kind: 'artist',
      seedId: 'artist-a',
      now: date,
    });
    const byOldTrack = buildDiscoveryMix(fixture(), guest, {
      kind: 'artist',
      seedId: 'a',
      now: date,
    });
    expect(byOldTrack.tracks.map((track) => track.id)).toEqual(
      byArtist.tracks.map((track) => track.id),
    );
  });

  it('never turns a missing or unavailable artist seed into a random station', () => {
    const db = fixture();
    expect(
      buildDiscoveryMix(db, guest, { kind: 'artist', seedId: 'missing', now: date })
        .tracks,
    ).toEqual([]);
    db.tracks
      .filter((track) => track.artistId === 'artist-a')
      .forEach((track) => {
        track.audio!.processingStatus = 'pending';
      });
    expect(
      buildDiscoveryMix(db, guest, { kind: 'artist', seedId: 'artist-a', now: date })
        .tracks,
    ).toEqual([]);
  });

  it('prioritizes matching Song Radio songs before unrelated fallback', () => {
    const db = fixture();
    const result = buildDiscoveryMix(db, guest, {
      kind: 'song',
      seedId: 'a',
      limit: 4,
      now: date,
    });
    const ids = result.tracks.map((track) => track.id);
    expect(ids[0]).toBe('a');
    // Song a shares pop with b and d, and mood with e; unrelated rock/happy c
    // must not displace any of those matching tracks in a four-song mix.
    expect(ids).toContain('b');
    expect(ids).toContain('d');
    expect(ids).toContain('e');
    expect(ids).not.toContain('c');
  });

  it('lets familiar radio stay entirely within related songs', () => {
    const station = buildDiscoveryMix(fixture(), guest, {
      kind: 'song',
      seedId: 'a',
      radioMode: 'familiar',
      now: date,
    });
    expect(station.tracks.map((track) => track.id).sort()).toEqual(['a', 'b', 'd', 'e']);
  });

  it('explore mode introduces unrelated music earlier while preserving song seed', () => {
    const balanced = buildDiscoveryMix(fixture(), guest, {
      kind: 'song',
      seedId: 'a',
      radioMode: 'balanced',
      limit: 4,
      now: date,
    });
    const explore = buildDiscoveryMix(fixture(), guest, {
      kind: 'song',
      seedId: 'a',
      radioMode: 'explore',
      limit: 4,
      now: date,
    });
    expect(balanced.tracks.map((track) => track.id)).not.toContain('c');
    expect(explore.tracks[0]?.id).toBe('a');
    expect(explore.tracks.map((track) => track.id)).toContain('c');
  });

  it('keeps genre radio within genre regardless of radio discovery preference', () => {
    const result = buildDiscoveryMix(fixture(), guest, {
      kind: 'genre',
      seedId: 'pop',
      radioMode: 'explore',
      now: date,
    });
    expect(result.tracks.every((track) => track.genreId === 'pop')).toBe(true);
  });

  it('genre radio selects only tracks in the chosen active genre', () => {
    const result = buildDiscoveryMix(fixture(), guest, {
      kind: 'genre',
      seedId: 'pop',
      now: date,
    });
    expect(result.tracks.length).toBeGreaterThan(0);
    expect(
      result.tracks.every((track) => (track.genreIds ?? [track.genreId]).includes('pop')),
    ).toBe(true);
  });

  it('mood radio selects only tracks with the chosen mood', () => {
    const result = buildDiscoveryMix(fixture(), guest, {
      kind: 'mood',
      seedId: 'chill',
      now: date,
    });
    expect(result.tracks.length).toBeGreaterThan(0);
    expect(result.tracks.every((track) => track.moodIds.includes('chill'))).toBe(true);
  });

  it('does not fall back to unrelated songs for unknown radio categories', () => {
    const result = buildDiscoveryMix(fixture(), guest, {
      kind: 'genre',
      seedId: 'missing',
      now: date,
    });
    expect(result.tracks).toHaveLength(0);
  });

  it('song radio continues after its seed has been heard without replaying it', () => {
    const result = buildDiscoveryMix(fixture(), guest, {
      kind: 'song',
      seedId: 'a',
      excludeIds: ['a'],
      now: date,
    });
    expect(result.tracks.length).toBeGreaterThan(0);
    expect(result.tracks.some((track) => track.id === 'a')).toBe(false);
  });

  it('honors hidden genres, hidden tracks and playable access', () => {
    const db = fixture();
    db.tracks.find((track) => track.id === 'e')!.audio!.processingStatus = 'pending';
    const result = buildDiscoveryMix(db, guest, {
      kind: 'weekly',
      blockedGenreIds: ['pop'],
      excludeIds: ['c'],
      now: date,
    });
    expect(result.tracks).toHaveLength(0);
  });

  it('prioritizes unheard songs in weekly mixes while still filling a small catalog', () => {
    const db = fixture();
    db.history = [
      { userId: 'listener-1', trackId: 'a', playedAt: '2026-11-12T00:00:00.000Z' },
      { userId: 'listener-1', trackId: 'b', playedAt: '2026-11-12T00:00:00.000Z' },
      { userId: 'listener-1', trackId: 'd', playedAt: '2026-11-12T00:00:00.000Z' },
    ];
    const viewer = { userId: 'listener-1', roles: [] };
    const result = buildDiscoveryMix(db, viewer, { kind: 'weekly', now: date, limit: 5 });
    const ids = result.tracks.map((track) => track.id);
    expect(ids.slice(0, 2).sort()).toEqual(['c', 'e']);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
  });

  it('keeps anonymous weekly discovery independent of another listener history', () => {
    const db = fixture();
    const before = buildDiscoveryMix(db, guest, { kind: 'weekly', now: date });
    db.history = [
      { userId: 'listener-1', trackId: 'a', playedAt: '2026-11-12T00:00:00.000Z' },
    ];
    const after = buildDiscoveryMix(db, guest, { kind: 'weekly', now: date });
    expect(after.tracks.map((track) => track.id)).toEqual(
      before.tracks.map((track) => track.id),
    );
  });

  it('does not return unreleased or rejected songs', () => {
    const db = fixture();
    db.tracks.find((track) => track.id === 'b')!.reviewStatus = 'rejected';
    db.tracks.find((track) => track.id === 'c')!.releaseAt = '2100-01-01T00:00:00.000Z';
    const result = buildDiscoveryMix(db, guest, { kind: 'flow', now: date });
    expect(result.tracks.some((track) => track.id === 'b' || track.id === 'c')).toBe(
      false,
    );
  });
});
