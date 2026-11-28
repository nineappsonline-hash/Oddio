import { describe, expect, it } from 'vitest';
import { podcastEditorialNote, podcastEditorialRevision } from './editorial-notes';

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

  it('dates only genuinely applied editorial summaries', () => {
    expect(podcastEditorialRevision(ship, show)).toBe('2026-11-28');
    expect(
      podcastEditorialRevision({ ...ship, description: 'Creator text' }, show),
    ).toBeUndefined();
    expect(podcastEditorialRevision(ship, 'other-show')).toBeUndefined();
    expect(
      podcastEditorialRevision({ ...ship, title: 'New title' }, show),
    ).toBeUndefined();
    expect(
      podcastEditorialRevision({ ...ship, id: 'new-episode' }, show),
    ).toBeUndefined();
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

  it.each([
    [
      'be01daec-0527-433e-86da-8b3e453160a7',
      'هل ممكن تكون حياتك كلها مجرد وهم؟',
      'فرضية المحاكاة',
      'simulation hypothesis',
    ],
    [
      'c2b4cc22-0b92-4b99-9b97-0ac711c0bea1',
      'هل النجاح محتاج موهبة ولا حظ',
      'الحظ',
      'opportunity',
    ],
    [
      'abe36723-d7e0-4ec7-a151-5ff2574f51c8',
      'إنت حر... بس على مزاج مين',
      'مبدأ الضرر',
      'harm principle',
    ],
  ])(
    'uses verified bilingual philosophy copy for %s only in its own series',
    (id, title, ar, en) => {
      expect(podcastEditorialNote({ id, title }, 'show-mwjp231e', 'ar')).toContain(ar);
      expect(podcastEditorialNote({ id, title }, 'show-mwjp231e', 'en')).toContain(en);
      expect(podcastEditorialNote({ id, title }, show, 'ar')).toBe('');
    },
  );
});
