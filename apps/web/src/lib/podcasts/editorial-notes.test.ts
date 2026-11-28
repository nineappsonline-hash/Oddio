import { describe, expect, it } from 'vitest';
import { podcastEditorialNote } from './editorial-notes';

const show = 'show-mwky0f05';
const ship = {
  id: '2a21189b-e1e5-47b1-a141-a6ef83a22606',
  title: 'سفينة من غير طاقم',
  description: '  ',
};

describe('public podcast notes', () => {
  it('gives matching published episodes a localized summary', () => {
    expect(podcastEditorialNote(ship, show, 'ar')).toContain('ماري سيليست');
    expect(podcastEditorialNote(ship, show, 'en')).toContain('Mary Celeste');
  });

  it('does not match unrelated episodes', () => {
    expect(podcastEditorialNote(ship, 'other-show', 'ar')).toBe('');
    expect(podcastEditorialNote({ ...ship, id: 'different' }, show, 'ar')).toBe('');
    expect(podcastEditorialNote({ ...ship, title: 'Different title' }, show, 'ar')).toBe(
      '',
    );
  });

  it('identifies the fictional story as fiction in both languages', () => {
    const city = {
      id: 'a01787b7-e549-4a25-b1cc-4d4f11569ebb',
      title: 'مدينة من غير أسرار',
      description: '',
    };
    expect(podcastEditorialNote(city, show, 'ar')).toMatch(/^حكاية خيالية/);
    expect(podcastEditorialNote(city, show, 'en')).toMatch(/^A fictional mystery/);
  });
});
