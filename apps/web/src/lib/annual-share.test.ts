import { describe, expect, it } from 'vitest';
import type { ListeningDNA } from './data/annual-listening-dna';
import { annualShareText } from './annual-share';

const report: ListeningDNA = {
  year: 2026, qualifiedListens: 45, tracks: 12, artists: 6, activeMonths: 5,
  genres: [{ id: 'pop', name: 'Pop', plays: 20 }],
  topTracks: [{ id: 'song', title: 'Private song', artist: 'Private artist', plays: 8 }],
  topArtists: [{ id: 'artist', name: 'Chosen artist', plays: 28 }],
};

describe('annual Rewind explicit share fields', () => {
  it('keeps song and artist identity out of the default sharing text', () => {
    const text = annualShareText(report, 'en', { includeTopArtist: false, includeTopGenre: false });
    expect(text).toContain('45 qualified listens');
    expect(text).not.toContain('Private song');
    expect(text).not.toContain('Chosen artist');
    expect(text).not.toContain('Pop');
    expect(text).not.toContain('track-ids');
  });

  it('only includes optional top artist and genre when explicitly selected', () => {
    const text = annualShareText(report, 'ar', { includeTopArtist: true, includeTopGenre: true });
    expect(text).toContain('Chosen artist');
    expect(text).toContain('Pop');
    expect(text).not.toContain('Private song');
    expect(text).not.toContain('artist-ids');
  });

  it('does not provide a share payload when there are no qualified listens', () => {
    expect(annualShareText({ ...report, qualifiedListens: 0 }, 'en', {
      includeTopArtist: true, includeTopGenre: true,
    })).toBe('');
  });
});
