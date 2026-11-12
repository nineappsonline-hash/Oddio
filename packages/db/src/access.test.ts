import { describe, expect, it } from 'vitest';
import type { Track } from '@ai-music/contracts';
import {
  buildChart,
  canViewPlaylist,
  evaluateTrackAccess,
  evaluateUploadQuota,
  isReleased,
  qualifiedPlays,
  scoreChartPoint,
  uniqueSlug,
  utcDateKey,
  type Viewer,
} from './index';

const NOW = new Date('2026-01-10T12:00:00.000Z');

function track(overrides: Partial<Track> = {}): Track {
  return {
    id: '50000000-0000-4000-8000-000000000001',
    artistId: '30000000-0000-4000-8000-000000000001',
    albumId: null,
    title: 'Neon Pharaonic',
    slug: 'neon-pharaonic',
    description: '',
    genreId: '10000000-0000-4000-8000-000000000001',
    moodIds: [],
    languageCode: 'en',
    countryCode: 'EG',
    productionType: 'fully_ai',
    aiTools: 'test',
    explicit: false,
    visibility: 'public',
    reviewStatus: 'approved',
    publishStatus: 'published',
    releaseAt: '2026-01-01T00:00:00.000Z',
    durationMs: 214_000,
    lyrics: '',
    credits: '',
    artwork: { url: '', accent: '#9D5CFF' },
    audioUrl: '',
    audio: null,
    qualityLabel: 'high',
    qualifiedPlays: 0,
    likeCount: 0,
    commentCount: 0,
    createdAt: '2025-12-01T00:00:00.000Z',
    updatedAt: '2025-12-01T00:00:00.000Z',
    ...overrides,
  };
}

const anon: Viewer = { userId: null, roles: [] };
const owner: Viewer = { userId: '70000000-0000-4000-8000-000000000002', roles: [] };
const moderator: Viewer = {
  userId: '70000000-0000-4000-8000-000000000005',
  roles: ['moderator'],
};
const OWNER_ID = owner.userId!;

describe('evaluateTrackAccess', () => {
  it('allows anonymous access to released public tracks', () => {
    const access = evaluateTrackAccess(track(), anon, NOW);
    expect(access).toMatchObject({
      allowed: true,
      listable: true,
      indexable: true,
      reason: 'public',
    });
  });

  it('allows unlisted tracks by direct link but hides them from listings', () => {
    const access = evaluateTrackAccess(track({ visibility: 'unlisted' }), anon, NOW);
    expect(access.allowed).toBe(true);
    expect(access.listable).toBe(false);
    expect(access.indexable).toBe(false);
    expect(access.reason).toBe('unlisted');
  });

  it('denies private tracks to everyone except the owner and staff', () => {
    const priv = track({ visibility: 'private' });
    expect(evaluateTrackAccess(priv, anon, NOW).allowed).toBe(false);
    expect(evaluateTrackAccess(priv, owner, NOW, OWNER_ID).allowed).toBe(true);
    expect(evaluateTrackAccess(priv, moderator, NOW).allowed).toBe(true);
  });

  it('never exposes pending or rejected tracks publicly', () => {
    expect(
      evaluateTrackAccess(track({ reviewStatus: 'pending_review' }), anon, NOW).reason,
    ).toBe('not_approved');
    expect(
      evaluateTrackAccess(track({ reviewStatus: 'rejected' }), anon, NOW).reason,
    ).toBe('blocked');
    expect(
      evaluateTrackAccess(track({ reviewStatus: 'rejected' }), owner, NOW, OWNER_ID)
        .allowed,
    ).toBe(false);
  });

  it('blocks playback before a scheduled release, including for the owner', () => {
    const scheduled = track({
      publishStatus: 'scheduled',
      releaseAt: '2026-02-01T00:00:00.000Z',
    });
    expect(evaluateTrackAccess(scheduled, anon, NOW).allowed).toBe(false);
    expect(evaluateTrackAccess(scheduled, owner, NOW, OWNER_ID).allowed).toBe(false);
  });

  it('staff can inspect unreleased work but do not make it listable', () => {
    const draft = track({ reviewStatus: 'draft', publishStatus: 'unpublished' });
    const access = evaluateTrackAccess(draft, moderator, NOW);
    expect(access.allowed).toBe(true);
    expect(access.listable).toBe(false);
    expect(access.chartEligible).toBe(false);
  });
});

describe('playlists and release helpers', () => {
  it('keeps private playlists private', () => {
    expect(canViewPlaylist({ visibility: 'private', ownerId: OWNER_ID }, anon)).toBe(
      false,
    );
    expect(canViewPlaylist({ visibility: 'private', ownerId: OWNER_ID }, owner)).toBe(
      true,
    );
    expect(canViewPlaylist({ visibility: 'public', ownerId: OWNER_ID }, anon)).toBe(true);
  });

  it('compares release timestamps in UTC', () => {
    expect(isReleased({ releaseAt: '2026-01-10T11:59:59.000Z' }, NOW)).toBe(true);
    expect(isReleased({ releaseAt: '2026-01-10T12:00:01.000Z' }, NOW)).toBe(false);
  });
});

describe('upload quota', () => {
  const event = (idempotencyKey: string, status: 'counted' | 'failed' = 'counted') => ({
    userId: 'u1',
    countedDateUtc: '2026-01-10',
    status,
    idempotencyKey,
  });

  it('deduplicates retries by idempotency key', () => {
    const result = evaluateUploadQuota(
      [event('a'), event('a'), event('b'), event('c', 'failed')],
      'u1',
      3,
      '2026-01-10',
    );
    expect(result).toMatchObject({ allowed: true, used: 2, remaining: 1, limit: 3 });
  });

  it('rejects the next upload once the limit is reached', () => {
    const result = evaluateUploadQuota([event('a'), event('b')], 'u1', 2, '2026-01-10');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('ignores other users and other UTC days', () => {
    const result = evaluateUploadQuota(
      [
        event('a'),
        { ...event('b'), userId: 'u2' },
        { ...event('c'), countedDateUtc: '2026-01-09' },
      ],
      'u1',
      1,
      '2026-01-10',
    );
    expect(result.used).toBe(1);
    expect(result.allowed).toBe(false);
  });

  it('formats the UTC date key', () => {
    expect(utcDateKey(new Date('2026-01-10T23:59:59.000Z'))).toBe('2026-01-10');
  });
});

describe('charts and qualified plays', () => {
  it('orders by dampened score and keeps qualified plays only', () => {
    const entries = buildChart([
      { trackId: 'a', qualifiedPlays: 100, uniqueListeners: 10, completedRate: 1 },
      { trackId: 'b', qualifiedPlays: 120, uniqueListeners: 2, completedRate: 0 },
      { trackId: 'c', qualifiedPlays: 0, uniqueListeners: 50 },
    ]);
    expect(entries.map((entry) => entry.trackId)).toEqual(['a', 'b']);
    expect(entries[0]!.rank).toBe(1);
    expect(
      scoreChartPoint({ trackId: 'x', qualifiedPlays: 0, uniqueListeners: 99 }),
    ).toBe(0);
  });

  it('counts one qualified play per session and track after the threshold', () => {
    const samples = [
      {
        trackId: 't1',
        sessionId: 's1',
        audibleMs: 31_000,
        durationMs: 200_000,
        occurredAt: '2026-01-10T10:00:00Z',
      },
      {
        trackId: 't1',
        sessionId: 's1',
        audibleMs: 90_000,
        durationMs: 200_000,
        occurredAt: '2026-01-10T10:01:00Z',
      },
      {
        trackId: 't1',
        sessionId: 's2',
        audibleMs: 29_999,
        durationMs: 200_000,
        occurredAt: '2026-01-10T10:02:00Z',
      },
      {
        trackId: 't1',
        sessionId: 's3',
        audibleMs: 4_000,
        durationMs: 4_000,
        occurredAt: '2026-01-10T10:03:00Z',
      },
    ];
    expect(qualifiedPlays(samples, NOW)).toBe(2);
  });
});

describe('slug helpers', () => {
  it('creates a unique slug without collisions', () => {
    expect(uniqueSlug('Neon Pharaonic', [])).toBe('neon-pharaonic');
    expect(uniqueSlug('Neon Pharaonic', ['neon-pharaonic', 'neon-pharaonic-2'])).toBe(
      'neon-pharaonic-3',
    );
    expect(uniqueSlug('!!!', [])).toBe('untitled');
  });
});
