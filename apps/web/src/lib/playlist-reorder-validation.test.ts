import { describe, expect, it } from 'vitest';
import { isValidPlaylistReorder } from './playlist-reorder-validation';

describe('isValidPlaylistReorder', () => {
  const original = ['song-a', 'song-b', 'song-c'];

  it('accepts permutation when the old version matches', () => {
    expect(
      isValidPlaylistReorder(original, original, ['song-c', 'song-a', 'song-b']),
    ).toBe(true);
  });

  it('rejects stale editor order', () => {
    expect(
      isValidPlaylistReorder(
        original,
        ['song-b', 'song-a', 'song-c'],
        ['song-c', 'song-a', 'song-b'],
      ),
    ).toBe(false);
  });

  it('rejects missing, added and duplicate track ids', () => {
    expect(isValidPlaylistReorder(original, original, ['song-a', 'song-b'])).toBe(false);
    expect(
      isValidPlaylistReorder(original, original, ['song-a', 'song-b', 'unknown']),
    ).toBe(false);
    expect(
      isValidPlaylistReorder(original, original, ['song-a', 'song-b', 'song-b']),
    ).toBe(false);
    expect(
      isValidPlaylistReorder(
        ['song-a', 'song-a'],
        ['song-a', 'song-a'],
        ['song-a', 'song-a'],
      ),
    ).toBe(false);
  });

  it('accepts empty unchanged playlist', () => {
    expect(isValidPlaylistReorder([], [], [])).toBe(true);
  });
});
