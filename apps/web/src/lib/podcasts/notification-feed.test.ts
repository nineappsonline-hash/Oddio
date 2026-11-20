import { describe, expect, it } from 'vitest';
import { podcastNotificationCandidates } from './notification-feed';

const follow = (showId: string, followedAt: string) => ({ showId, followedAt });
const episode = (id: string, showId: string, publishedAt: string) => ({
  id,
  showId,
  publishedAt,
});
const now = Date.parse('2026-11-20T12:00:00Z');

describe('podcast new episode alerts', () => {
  it('only alerts about episodes after the user followed a series', () => {
    const result = podcastNotificationCandidates(
      [
        episode('old', 'show-a', '2026-11-01T00:00:00Z'),
        episode('new', 'show-a', '2026-11-19T00:00:00Z'),
        episode('other', 'show-b', '2026-11-19T00:00:00Z'),
      ],
      [follow('show-a', '2026-11-10T00:00:00Z')],
      now,
    );
    expect(result.map((item) => item.episodeId)).toEqual(['new']);
  });

  it('rejects future, invalid and out-of-window dates', () => {
    const result = podcastNotificationCandidates(
      [
        episode('future', 'show-a', '2026-11-21T00:00:00Z'),
        episode('invalid', 'show-a', 'not-a-date'),
        episode('ancient', 'show-a', '2025-01-01T00:00:00Z'),
        episode('recent', 'show-a', '2026-11-20T09:00:00Z'),
      ],
      [follow('show-a', '2024-01-01T00:00:00Z')],
      now,
    );
    expect(result.map((item) => item.episodeId)).toEqual(['recent']);
  });

  it('orders newest alerts first deterministically', () => {
    const result = podcastNotificationCandidates(
      [
        episode('z', 'show-a', '2026-11-19T00:00:00Z'),
        episode('a', 'show-a', '2026-11-19T00:00:00Z'),
        episode('old', 'show-a', '2026-11-15T00:00:00Z'),
      ],
      [follow('show-a', '2026-11-01T00:00:00Z')],
      now,
    );
    expect(result.map((item) => item.episodeId)).toEqual(['a', 'z', 'old']);
  });

  it('returns an empty inbox for guests with no followed shows', () => {
    expect(
      podcastNotificationCandidates(
        [episode('ep', 'show', '2026-11-20T08:00:00Z')],
        [],
        now,
      ),
    ).toEqual([]);
  });

  it('caps the notification inbox to 75 entries', () => {
    const candidates = Array.from({ length: 120 }, (_, i) =>
      episode(String(i), 'show', '2026-11-20T08:00:00Z'),
    );
    expect(
      podcastNotificationCandidates(
        candidates,
        [follow('show', '2026-11-19T00:00:00Z')],
        now,
      ),
    ).toHaveLength(75);
  });
});
