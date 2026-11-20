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

  it('requires all explicit genre, mood and language facets together', () => {
    const db = dbFixture();
    expect(
      promptDiscoveryTracks(db, viewer, 'calm Arabic pop').tracks.map(
        (track) => track.id,
      ),
    ).toEqual(['arabic']);
    expect(
      promptDiscoveryTracks(db, viewer, 'موسيقى عربي بوب هادية').tracks.map(
        (track) => track.id,
      ),
    ).toEqual(['arabic']);
    expect(promptDiscoveryTracks(db, viewer, 'Arabic energetic rock').tracks).toEqual([]);
    expect(
      promptDiscoveryTracks(db, viewer, 'English energetic rock').tracks.map(
        (track) => track.id,
      ),
    ).toEqual(['english']);
  });

  it('never treats a language-only partial match as satisfying a conflicting genre', () => {
    const result = promptDiscoveryTracks(dbFixture(), viewer, 'English pop');
    expect(result.tracks).toEqual([]);
    expect(result.reasons).toEqual({});
  });

  it('only accepts BPM requests when analysis confidence and duration are adequate', () => {
    const db = dbFixture();
    const arabic = db.tracks.find((track) => track.id === 'arabic')!;
    const english = db.tracks.find((track) => track.id === 'english')!;
    arabic.audioFeatures = {
      schemaVersion: 1,
      tempoBpm: 120,
      tempoConfidence: 0.9,
      rmsDbfs: -12,
      peakDbfs: -2,
      analyzedSeconds: 25,
    };
    english.audioFeatures = {
      schemaVersion: 1,
      tempoBpm: 120,
      tempoConfidence: 0.2,
      rmsDbfs: -12,
      peakDbfs: -2,
      analyzedSeconds: 25,
    };
    const matched = promptDiscoveryTracks(db, viewer, '120 bpm');
    expect(matched.tracks.map((track) => track.id)).toEqual(['arabic']);
    expect(matched.reasons.arabic).toContainEqual({ kind: 'tempo', value: '120 BPM' });
    expect(promptDiscoveryTracks(db, viewer, 'English 120 bpm').tracks).toEqual([]);
    arabic.audioFeatures = { ...arabic.audioFeatures, analyzedSeconds: 4 };
    expect(promptDiscoveryTracks(db, viewer, '120 bpm').tracks).toEqual([]);
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
