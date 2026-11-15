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
    genres: [{ id: 'pop', slug: 'pop', labelEn: 'Pop', labelAr: 'بوب', active: true }, { id: 'rock', slug: 'rock', labelEn: 'Rock', labelAr: 'روك', active: true }],
    moods: [{ id: 'chill', slug: 'chill', labelEn: 'Chill', labelAr: 'هادي', active: true }, { id: 'happy', slug: 'happy', labelEn: 'Happy', labelAr: 'سعيد', active: true }],
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

  it('genre radio selects only tracks in the chosen active genre', () => {
    const result = buildDiscoveryMix(fixture(), guest, {
      kind: 'genre', seedId: 'pop', now: date,
    });
    expect(result.tracks.length).toBeGreaterThan(0);
    expect(result.tracks.every((track) => track.genreIds.includes('pop'))).toBe(true);
  });

  it('mood radio selects only tracks with the chosen mood', () => {
    const result = buildDiscoveryMix(fixture(), guest, {
      kind: 'mood', seedId: 'chill', now: date,
    });
    expect(result.tracks.length).toBeGreaterThan(0);
    expect(result.tracks.every((track) => track.moodIds.includes('chill'))).toBe(true);
  });

  it('does not fall back to unrelated songs for unknown radio categories', () => {
    const result = buildDiscoveryMix(fixture(), guest, {
      kind: 'genre', seedId: 'missing', now: date,
    });
    expect(result.tracks).toHaveLength(0);
  });

  it('song radio continues after its seed has been heard without replaying it', () => {
    const result = buildDiscoveryMix(fixture(), guest, {
      kind: 'song', seedId: 'a', excludeIds: ['a'], now: date,
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
