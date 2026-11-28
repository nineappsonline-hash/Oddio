import { describe, expect, it } from 'vitest';
import { podcastEpisodeDescription, podcastMetaDescription } from './editorial-notes';

const show = 'show-mwky0f05';
const ship = {
  id: '2a21189b-e1e5-47b1-a141-a6ef83a22606',
  title: 'سفينة من غير طاقم',
  description: '  ',
};

describe('public podcast notes', () => {
  it('gives matching published episodes a localized summary', () => {
    expect(podcastEpisodeDescription(ship, show, 'ar')).toContain('ماري سيليست');
    expect(podcastEpisodeDescription(ship, show, 'en')).toContain('Mary Celeste');
  });

  it('keeps the creator’s real description and does not match unrelated episodes', () => {
    expect(
      podcastEpisodeDescription({ ...ship, description: ' Original ' }, show, 'ar'),
    ).toBe('Original');
    expect(podcastEpisodeDescription(ship, 'other-show', 'ar')).toBe('');
    expect(podcastEpisodeDescription({ ...ship, id: 'different' }, show, 'ar')).toBe('');
    expect(
      podcastEpisodeDescription({ ...ship, title: 'Different title' }, show, 'ar'),
    ).toBe('');
  });

  it('identifies the fictional story as fiction in both languages', () => {
    const city = {
      id: 'a01787b7-e549-4a25-b1cc-4d4f11569ebb',
      title: 'مدينة من غير أسرار',
      description: '',
    };
    expect(podcastEpisodeDescription(city, show, 'ar')).toMatch(/^حكاية خيالية/);
    expect(podcastEpisodeDescription(city, show, 'en')).toMatch(/^A fictional mystery/);
  });

  it('normalizes and bounds metadata without chopping a normal word', () => {
    expect(podcastMetaDescription(' test\n copy  ')).toBe('test copy');
    expect(podcastMetaDescription('Episode summary '.repeat(15))).toMatch(
      /(?:Episode|summary)…$/,
    );
    expect(
      podcastMetaDescription('Episode summary '.repeat(15)).length,
    ).toBeLessThanOrEqual(160);
  });
});
