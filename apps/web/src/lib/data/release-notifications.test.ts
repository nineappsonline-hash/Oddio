import { describe, expect, it } from 'vitest';
import type { Notification, Track } from '@ai-music/contracts';
import type { DemoDb } from './types';
import { notifyFollowersOfRelease } from './release-notifications';

const NOW = new Date('2026-03-01T12:00:00.000Z');
const OWNER = 'user-owner';
const TRACK_ID = 'track-1';

function track(overrides: Partial<Track> = {}): Track {
  return {
    id: TRACK_ID,
    artistId: 'artist-1',
    albumId: null,
    title: 'Neon Pharaonic',
    slug: 'neon-pharaonic',
    description: '',
    genreId: 'genre-1',
    moodIds: [],
    languageCode: 'en',
    countryCode: 'EG',
    productionType: 'fully_ai',
    aiTools: '',
    explicit: false,
    visibility: 'public',
    reviewStatus: 'approved',
    publishStatus: 'published',
    releaseAt: '2026-02-01T00:00:00.000Z',
    durationMs: 200_000,
    lyrics: '',
    credits: '',
    artwork: { url: '', accent: '#9D5CFF' },
    audioUrl: '',
    audio: null,
    qualityLabel: 'high',
    qualifiedPlays: 0,
    likeCount: 0,
    commentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function database(overrides: Partial<DemoDb> = {}): DemoDb {
  const base = {
    artists: [{ id: 'artist-1', ownerUserId: OWNER, name: 'Nova Khepri' }],
    artistFollows: [
      { userId: 'follower-a', artistId: 'artist-1', createdAt: NOW.toISOString() },
      { userId: OWNER, artistId: 'artist-1', createdAt: NOW.toISOString() },
      { userId: 'follower-optout', artistId: 'artist-1', createdAt: NOW.toISOString() },
      { userId: 'follower-dupe', artistId: 'artist-1', createdAt: NOW.toISOString() },
    ],
    notificationPreferences: [
      {
        userId: 'follower-optout',
        releaseAlerts: false,
        emailOptIn: false,
        pushOptIn: false,
      },
    ],
    notifications: [
      {
        id: 'existing',
        userId: 'follower-dupe',
        type: 'new_release',
        title: 'Earlier release',
        body: '',
        payload: { trackId: TRACK_ID },
        readAt: null,
        createdAt: NOW.toISOString(),
      },
    ],
    ...overrides,
  };
  return base as unknown as DemoDb;
}

describe('notifyFollowersOfRelease', () => {
  it('creates one notification for eligible followers only', () => {
    const db = database();
    const created = notifyFollowersOfRelease(db, track(), NOW);
    expect(created.map((item) => item.userId)).toEqual(['follower-a']);
    expect(
      db.notifications.filter((item: Notification) => item.payload?.trackId === TRACK_ID),
    ).toHaveLength(2);
    expect(db.notifications.at(-1)?.type).toBe('new_release');
    expect(db.notifications.at(-1)?.title).toContain('Nova Khepri');
  });

  it('is idempotent for a track', () => {
    const db = database();
    notifyFollowersOfRelease(db, track(), NOW);
    expect(notifyFollowersOfRelease(db, track(), NOW)).toHaveLength(0);
  });

  it('does not announce private, unlisted, scheduled or future tracks', () => {
    for (const overrides of [
      { visibility: 'private' as const },
      { visibility: 'unlisted' as const },
      { publishStatus: 'scheduled' as const },
      { releaseAt: '2026-04-01T00:00:00.000Z' },
      { reviewStatus: 'pending_review' as const },
    ]) {
      expect(notifyFollowersOfRelease(database(), track(overrides), NOW)).toHaveLength(0);
    }
  });
});
