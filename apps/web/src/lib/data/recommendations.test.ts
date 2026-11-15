import { describe, expect, it } from 'vitest';
import type { DemoDb } from './types';
import { recommendTracks } from './recommendations';

function fixture(): DemoDb {
  const now = '2026-01-01T00:00:00.000Z';
  const tracks = [
    ['seed', 'artist-a', 'genre-a', ['mood-a'], 0],
    ['match', 'artist-b', 'genre-a', ['mood-a'], 1],
    ['other', 'artist-c', 'genre-b', ['mood-b'], 100],
    ['match-two', 'artist-b', 'genre-a', ['mood-a'], 2],
  ].map(([id, artistId, genreId, moodIds, plays]) => ({
    id, artistId, genreId, genreIds: [genreId], moodIds,
    qualifiedPlays: plays, releaseAt: now, visibility: 'public',
    reviewStatus: 'approved', publishStatus: 'published',
    audio: { kind: 'rendition', objectKey: id + '.mp3', processingStatus: 'ready' },
  }));
  return {
    tracks,
    artists: [{ id: 'artist-a', ownerUserId: 'owner' }, { id: 'artist-b', ownerUserId: 'owner' }, { id: 'artist-c', ownerUserId: 'owner' }],
    albums: [], genres: [], moods: [], comments: [], likes: [],
    playbackSessions: [], playbackEvents: [],
  } as unknown as DemoDb;
}

const viewer = { userId: 'listener', roles: [] };

describe('Oddio recommendations', () => {
  it('uses a deterministic popular fallback for guests', () => {
    const result = recommendTracks(fixture(), { userId: null, roles: [] }, 3);
    expect(result.personalized).toBe(false);
    expect(result.tracks.map((track) => track.id)).toEqual(['other', 'match-two', 'seed']);
  });

  it('prefers genre and mood matches without replaying liked tracks', () => {
    const db = fixture();
    db.likes.push({ userId: 'listener', trackId: 'seed', createdAt: '2026-01-01' });
    const result = recommendTracks(db, viewer, 3);
    expect(result.personalized).toBe(true);
    expect(result.tracks[0]?.id).toBe('match-two');
    expect(result.tracks.some((track) => track.id === 'seed')).toBe(false);
  });

  it('uses only qualified events belonging to the signed-in user', () => {
    const db = fixture();
    db.playbackSessions.push(
      { id: 'mine', userId: 'listener', anonymousSessionHash: null, startedAt: '', lastSeenAt: '' },
      { id: 'theirs', userId: 'other', anonymousSessionHash: null, startedAt: '', lastSeenAt: '' },
    );
    db.playbackEvents.push(
      { id: '1', sessionId: 'mine', trackId: 'seed', qualified: true, eventType: 'qualified', audibleMs: 30000, occurredAt: '', requestId: '1' },
      { id: '2', sessionId: 'theirs', trackId: 'other', qualified: true, eventType: 'qualified', audibleMs: 30000, occurredAt: '', requestId: '2' },
    );
    const result = recommendTracks(db, viewer, 2);
    expect(result.personalized).toBe(true);
    expect(result.tracks[0]?.id).toBe('match-two');
    expect(result.tracks.some((track) => track.id === 'seed')).toBe(false);
  });

  it('excludes unready audio and limits output', () => {
    const db = fixture();
    db.tracks.find((track) => track.id === 'other')!.audio!.processingStatus = 'pending';
    const result = recommendTracks(db, { userId: null, roles: [] }, 2);
    expect(result.tracks).toHaveLength(2);
    expect(result.tracks.some((track) => track.id === 'other')).toBe(false);
  });
});
