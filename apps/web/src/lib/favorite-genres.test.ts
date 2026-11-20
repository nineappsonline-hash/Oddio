import { describe, it, expect } from 'vitest';
import { favoriteGenresKey, normalizeFavoriteGenres } from './favorite-genres';

describe('favorite genre setup', () => {
  it('allows only three known, distinct genres', () => {
    expect(normalizeFavoriteGenres(['g1', 'g2', 'g1', 'bad', 'g3', 'g4'], ['g1','g2','g3','g4'])).toEqual(['g1','g2','g3']);
  });
  it('ignores malformed storage values', () => {
    expect(normalizeFavoriteGenres('x', ['x'])).toEqual([]);
    expect(normalizeFavoriteGenres([null, 8, 'x'], ['x'])).toEqual(['x']);
  });
  it('isolates device settings by listener', () => {
    expect(favoriteGenresKey('u1')).not.toEqual(favoriteGenresKey('u2'));
  });
});
