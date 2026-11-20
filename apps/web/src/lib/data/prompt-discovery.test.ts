import { describe, expect, it } from 'vitest';
import type { DemoDb } from './types';
import { promptDiscoveryTracks } from './prompt-discovery';

const viewer = { userId: null, roles: [] as [] };
function dbFixture(): DemoDb {
  const tracks = [
    {
      id: 'arabic',
      artistId: 'one',
      genreId: 'pop',
      genreIds: ['pop'],
      moodIds: ['calm'],
      languageCode: 'ar',
      qualifiedPlays: 10,
    },
    {
      id: 'english',
      artistId: 'two',
      genreId: 'rock',
      genreIds: ['rock'],
      moodIds: ['upbeat'],
      languageCode: 'en',
      qualifiedPlays: 50,
    },
    {
      id: 'hidden',
      artistId: 'three',
      genreId: 'pop',
      genreIds: ['pop'],
      moodIds: ['calm'],
      languageCode: 'ar',
      qualifiedPlays: 99,
      reviewStatus: 'rejected',
    },
  ].map((track) => ({
    ...track,
    title: track.id,
    reviewStatus: track.reviewStatus ?? 'approved',
    visibility: 'public',
    publishStatus: 'published',
    releaseAt: '2026-01-01T00:00:00Z',
    audio: { processingStatus: 'ready', objectKey: track.id + '.mp3' },
  }));
  return {
    tracks,
    artists: ['one', 'two', 'three'].map((id) => ({
      id,
      name: id,
      ownerUserId: 'owner',
    })),
    genres: [
      { id: 'pop', labelEn: 'Pop', labelAr: 'بوب', slug: 'pop', active: true },
      { id: 'rock', labelEn: 'Rock', labelAr: 'روك', slug: 'rock', active: true },
    ],
    moods: [
      { id: 'calm', labelEn: 'Chill', labelAr: 'هادي', slug: 'chill', active: true },
      {
        id: 'upbeat',
        labelEn: 'Energetic',
        labelAr: 'حماسي',
        slug: 'upbeat',
        active: true,
      },
    ],
    albums: [],
    comments: [],
    likes: [],
    playbackSessions: [],
    playbackEvents: [],
  } as unknown as DemoDb;
}

describe('prompt-generated playlists', () => {
  it('matches Arabic language and pop genre without exposing rejected content', () => {
    const result = promptDiscoveryTracks(dbFixture(), viewer, 'موسيقى عربي بوب');
    expect(result.matched).toBe(true);
    expect(result.tracks.map((track) => track.id)).toEqual(['arabic']);
  });

  it('explains matches only with catalog-backed language and genre labels', () => {
    const result = promptDiscoveryTracks(dbFixture(), viewer, 'موسيقى عربي بوب');
    expect(result.reasons.arabic).toContainEqual({ kind: 'language', value: 'ar' });
    expect(result.reasons.arabic).toContainEqual({ kind: 'genre', value: 'Pop' });
    expect(result.reasons.hidden).toBeUndefined();
  });

  it('never manufactures reasons when no music matched', () => {
    const result = promptDiscoveryTracks(dbFixture(), viewer, 'zebra outerspace');
    expect(result.reasons).toEqual({});
  });

  it('matches English genre words', () => {
    const result = promptDiscoveryTracks(dbFixture(), viewer, 'energetic rock');
    expect(result.matched).toBe(true);
    expect(result.tracks[0]?.id).toBe('english');
  });

  it('does not fabricate musical matches when the prompt has no catalog signals', () => {
    const result = promptDiscoveryTracks(dbFixture(), viewer, 'zebra outerspace');
    expect(result.matched).toBe(false);
    expect(result.tracks).toHaveLength(0);
  });

  it('returns no tracks for too-short prompts', () => {
    expect(promptDiscoveryTracks(dbFixture(), viewer, 'x').tracks).toHaveLength(0);
  });
});
