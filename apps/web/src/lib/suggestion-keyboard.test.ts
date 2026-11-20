import { describe, expect, it } from 'vitest';
import { nextSuggestionFocusIndex } from './suggestion-keyboard';

describe('search suggestion keyboard navigation', () => {
  it('moves down through options and stops at the final option', () => {
    expect(nextSuggestionFocusIndex(-1, 'down', 3)).toBe(0);
    expect(nextSuggestionFocusIndex(0, 'down', 3)).toBe(1);
    expect(nextSuggestionFocusIndex(2, 'down', 3)).toBe(2);
  });
  it('moves up from first option back to input', () => {
    expect(nextSuggestionFocusIndex(0, 'up', 3)).toBe(-1);
    expect(nextSuggestionFocusIndex(2, 'up', 3)).toBe(1);
  });
  it('returns to input when no options are present', () => {
    expect(nextSuggestionFocusIndex(0, 'down', 0)).toBe(-1);
  });
});
