import { describe, expect, it } from 'vitest';
import { activeLyricCueIndex } from './lyrics-timing';

const cues = [
  { start: 1, end: 2.5, text: 'one' },
  { start: 4, end: 6, text: 'two' },
  { start: 8, end: 10, text: 'three' },
];

describe('synchronised lyrics cue selection', () => {
  it('selects the active cue and returns -1 for gaps and invalid times', () => {
    expect(activeLyricCueIndex(cues, 1)).toBe(0);
    expect(activeLyricCueIndex(cues, 2.49)).toBe(0);
    expect(activeLyricCueIndex(cues, 2.5)).toBe(-1);
    expect(activeLyricCueIndex(cues, 4)).toBe(1);
    expect(activeLyricCueIndex(cues, 9)).toBe(2);
    expect(activeLyricCueIndex(cues, 10)).toBe(-1);
    expect(activeLyricCueIndex(cues, Number.NaN)).toBe(-1);
  });
  it('handles hundreds of cues and late seeks without a linear scan', () => {
    const long = Array.from({ length: 1200 }, (_, i) => ({
      start: i * 3,
      end: i * 3 + 2,
      text: String(i),
    }));
    expect(activeLyricCueIndex(long, 3501)).toBe(1167);
    expect(activeLyricCueIndex(long, 3503)).toBe(-1);
    expect(activeLyricCueIndex([], 1)).toBe(-1);
  });
});
