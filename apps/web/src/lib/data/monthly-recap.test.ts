import { describe, expect, it } from 'vitest';
import type { RecapListen } from './monthly-recap';
import { monthlyListeningRecap } from './monthly-recap';

const listen = (id: string, playedAt: string, artistId = 'one') => ({
  id,
  title: id,
  artistId,
  artist: { name: artistId },
  playedAt,
}) as RecapListen;

describe('private monthly listening recap', () => {
  it('only summarizes the selected UTC month and groups repeated listens', () => {
    const result = monthlyListeningRecap([
      listen('a', '2026-11-02T12:00:00Z'),
      listen('a', '2026-11-15T23:00:00Z'),
      listen('b', '2026-11-04T00:00:00Z', 'two'),
      listen('c', '2026-10-31T23:59:59Z'),
      listen('d', '2026-12-01T00:00:00Z'),
      listen('bad', 'nonsense'),
    ], 2026, 11);
    expect(result.qualifiedListens).toBe(3);
    expect(result.uniqueTracks).toBe(2);
    expect(result.uniqueArtists).toBe(2);
    expect(result.topTracks[0]).toMatchObject({ id: 'a', plays: 2 });
    expect(result.topArtists[0]).toMatchObject({ id: 'one', plays: 2 });
    expect(JSON.stringify(result)).not.toContain('playedAt');
  });
  it('returns truthful empty results if there is no listening history', () => {
    const result = monthlyListeningRecap([], 2026, 11);
    expect(result.qualifiedListens).toBe(0);
    expect(result.topTracks).toEqual([]);
  });
});
