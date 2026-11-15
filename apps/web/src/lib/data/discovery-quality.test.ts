import { describe, expect, it } from 'vitest';
import type { CatalogTrack } from './queries';
import { evaluateDiscoveryQuality } from './discovery-quality';

const track = (id: string, artistId: string, genreId: string) =>
  ({ id, artistId, genreId, genreIds: [genreId] }) as CatalogTrack;

describe('discovery quality baselines', () => {
  it('reports exposure concentration without retaining user identity', () => {
    const catalog = [
      track('one', 'a', 'pop'),
      track('two', 'a', 'pop'),
      track('three', 'b', 'rock'),
      track('four', 'c', 'pop'),
    ];
    const report = evaluateDiscoveryQuality(catalog, catalog.slice(0, 3));
    expect(report).toEqual({
      candidateCount: 4,
      shownCount: 3,
      uniqueArtists: 2,
      artistCoverage: 2 / 3,
      topArtistShare: 2 / 3,
      excludedTrackLeaks: 0,
      excludedGenreLeaks: 0,
    });
    expect(JSON.stringify(report)).not.toContain('artistId');
  });

  it('detects accidental hidden music exposure', () => {
    const selected = [track('one', 'a', 'pop'), track('two', 'b', 'rock')];
    const result = evaluateDiscoveryQuality(
      selected,
      selected,
      new Set(['one']),
      new Set(['rock']),
    );
    expect(result.excludedTrackLeaks).toBe(1);
    expect(result.excludedGenreLeaks).toBe(1);
  });

  it('does not divide by zero for an empty catalog', () => {
    expect(evaluateDiscoveryQuality([], []).artistCoverage).toBe(0);
    expect(evaluateDiscoveryQuality([], []).topArtistShare).toBe(0);
  });
});
