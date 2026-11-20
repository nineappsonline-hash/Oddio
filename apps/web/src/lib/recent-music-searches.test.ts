import { describe, expect, it } from 'vitest';
import { addRecentMusicSearch, sanitizeRecentMusicSearches } from './recent-music-searches';

describe('recent music searches', () => {
  it('deduplicates case-insensitively and promotes repeated searches', () => {
    expect(addRecentMusicSearch(' JAZZ ', ['Pop', 'jazz', 'Rock'])).toEqual(['JAZZ', 'Pop', 'Rock']);
  });
  it('removes invalid history and restricts count to eight', () => {
    expect(sanitizeRecentMusicSearches(['', 5, null, 'a', 'A', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']))
      .toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  });
  it('avoids adding blank terms', () => {
    expect(addRecentMusicSearch('  ', ['Pop'])).toEqual(['Pop']);
  });
  it('rejects corrupted storage values and oversized saved terms', () => {
    expect(sanitizeRecentMusicSearches({ q: 'hidden' })).toEqual([]);
    expect(sanitizeRecentMusicSearches(['x'.repeat(121), 'Rap'])).toEqual(['Rap']);
  });
});
