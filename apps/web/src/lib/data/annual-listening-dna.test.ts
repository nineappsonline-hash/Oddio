import { describe, expect, it } from 'vitest';
import type { RecapListen } from './monthly-recap';
import { annualListeningDNA } from './annual-listening-dna';

const visit = (id: string, playedAt: string, artistId: string, genreId?: string) =>
  ({
    id,
    title: id,
    playedAt,
    artistId,
    artist: { name: artistId },
    genre: genreId ? { id: genreId, labelEn: genreId, labelAr: genreId } : undefined,
  }) as RecapListen;

describe('Phase 7 annual Rewind and Music DNA', () => {
  it('counts only qualifying source events from its year, including repeats', () => {
    const result = annualListeningDNA(
      [
        visit('a', '2026-01-01T00:00:00Z', 'creator', 'pop'),
        visit('a', '2026-11-15T12:00:00Z', 'creator', 'pop'),
        visit('b', '2026-06-01T15:00:00Z', 'other', 'rock'),
        visit('c', '2025-12-31T23:59:59Z', 'foreign', 'folk'),
        visit('d', '2027-01-01T00:00:00Z', 'foreign', 'folk'),
      ],
      2026,
    );
    expect(result.qualifiedListens).toBe(3);
    expect(result.tracks).toBe(2);
    expect(result.artists).toBe(2);
    expect(result.activeMonths).toBe(3);
    expect(result.monthlyQualifiedListens).toHaveLength(12);
    expect(result.monthlyQualifiedListens[0]).toEqual({ month: 1, plays: 1 });
    expect(result.monthlyQualifiedListens[5]).toEqual({ month: 6, plays: 1 });
    expect(result.monthlyQualifiedListens[10]).toEqual({ month: 11, plays: 1 });
    expect(result.monthlyQualifiedListens.reduce((total, item) => total + item.plays, 0)).toBe(result.qualifiedListens);
    expect(result.topTracks[0]).toMatchObject({ id: 'a', plays: 2 });
    expect(result.genres[0]).toMatchObject({ id: 'pop', plays: 2 });
    expect(JSON.stringify(result)).not.toContain('playedAt');
  });
  it('does not fabricate a favorite genre or minutes from no data', () => {
    const empty = annualListeningDNA([], 2026, 'ar');
    expect(empty.genres).toEqual([]);
    expect(empty.qualifiedListens).toBe(0);
    expect(empty.monthlyQualifiedListens.every((item) => item.plays === 0)).toBe(true);
  });
});
