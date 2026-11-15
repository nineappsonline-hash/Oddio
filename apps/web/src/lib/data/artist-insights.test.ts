import { describe, expect, it } from 'vitest';
import type { DemoDb } from './types';
import { artistInsights } from './artist-insights';

const track = (id: string, artistId: string, plays = 0) => ({
  id,
  title: id,
  artistId,
  qualifiedPlays: plays,
  likeCount: 0,
  reviewStatus: 'approved',
  publishStatus: 'published',
});

function fixture(): DemoDb {
  return {
    artists: [
      { id: 'my-artist', ownerUserId: 'me' },
      { id: 'foreign-artist', ownerUserId: 'someone-else' },
    ],
    tracks: [track('mine', 'my-artist', 12), track('theirs', 'foreign-artist', 100)],
    artistFollows: [
      { artistId: 'my-artist', userId: 'listener-a' },
      { artistId: 'foreign-artist', userId: 'listener-b' },
    ],
    playbackEvents: [
      {
        id: 'event-1',
        sessionId: 's1',
        trackId: 'mine',
        qualified: true,
        eventType: 'qualified',
        audibleMs: 30000,
        requestId: 'r1',
        occurredAt: '2026-11-14T15:00:00.000Z',
      },
      {
        id: 'event-2',
        sessionId: 's2',
        trackId: 'theirs',
        qualified: true,
        eventType: 'qualified',
        audibleMs: 30000,
        requestId: 'r2',
        occurredAt: '2026-11-14T15:00:00.000Z',
      },
      {
        id: 'event-3',
        sessionId: 's3',
        trackId: 'mine',
        qualified: false,
        eventType: 'progress',
        audibleMs: 1000,
        requestId: 'r3',
        occurredAt: '2026-11-14T17:00:00.000Z',
      },
      {
        id: 'event-4',
        sessionId: 's4',
        trackId: 'mine',
        qualified: true,
        eventType: 'qualified',
        audibleMs: 30000,
        requestId: 'r4',
        occurredAt: '2026-09-14T15:00:00.000Z',
      },
    ],
  } as unknown as DemoDb;
}

describe('Phase 6 artist insights', () => {
  it('only shows owned tracks and counts qualified events in UTC time windows', () => {
    const report = artistInsights(fixture(), 'me', new Date('2026-11-15T14:00:00Z'));
    expect(report.artists).toBe(1);
    expect(report.tracks.map((entry) => entry.id)).toEqual(['mine']);
    expect(report.totalQualifiedPlays).toBe(12);
    expect(report.sevenDays).toBe(1);
    expect(report.thirtyDays).toBe(1);
    expect(report.daily).toHaveLength(30);
    expect(report.followers).toBe(1);
    expect(JSON.stringify(report)).not.toContain('listener-a');
    expect(JSON.stringify(report)).not.toContain('sessionId');
  });

  it('returns an empty, private report for a non-owner', () => {
    const result = artistInsights(fixture(), 'outsider');
    expect(result.tracks).toHaveLength(0);
    expect(result.totalQualifiedPlays).toBe(0);
    expect(result.thirtyDays).toBe(0);
  });
});
