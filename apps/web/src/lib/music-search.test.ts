import { describe, expect, it } from 'vitest';
import {
  normalizeMusicSearch,
  matchesMusicSearch,
  searchWords,
  searchRelevanceScore,
} from './music-search';

describe('Oddio bilingual search normalization', () => {
  it('ignores Arabic diacritics, tatweel and alef forms', () => {
    expect(normalizeMusicSearch('إِلَى السَّمَاءِ')).toBe('الي السماء');
    expect(normalizeMusicSearch('آمـال')).toBe('امال');
  });

  it('ignores English accents and repeated punctuation', () => {
    expect(normalizeMusicSearch('Café — SOUL!!')).toBe('cafe soul');
  });

  it('supports multiword search regardless of word order', () => {
    expect(matchesMusicSearch('أغنية من القَلْب الجميل', searchWords('القلب اغنيه'))).toBe(false);
    expect(matchesMusicSearch('أغنية من القَلْب الجميل', searchWords('القلب من'))).toBe(true);
  });

  it('prioritizes exact song titles over artist or description matches', () => {
    expect(searchRelevanceScore('Dream', 'Dream', 'Other')).toBeGreaterThan(
      searchRelevanceScore('Dream', 'The Night', 'Dream'),
    );
    expect(searchRelevanceScore('Dream', 'Dreaming', 'Other')).toBeGreaterThan(
      searchRelevanceScore('Dream', 'New', 'Other', 'Dreamy atmosphere'),
    );
  });

  it('does not claim arbitrary English phonetics map to Arabic names', () => {
    expect(matchesMusicSearch('أحمد', searchWords('Ahmed'))).toBe(false);
  });
});
