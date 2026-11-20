import { describe, expect, it } from 'vitest';
import { resumablePodcastProgress } from './podcast-resume-progress';

describe('resumablePodcastProgress', () => {
  it('hides fresh and effectively finished episodes', () => {
    expect(resumablePodcastProgress(0, 600)).toBeNull();
    expect(resumablePodcastProgress(14, 600)).toBeNull();
    expect(resumablePodcastProgress(590, 600)).toBeNull();
    expect(resumablePodcastProgress(600, 600)).toBeNull();
  });
  it('returns meaningful, clamped progress for unfinished episodes', () => {
    expect(resumablePodcastProgress(150, 600)).toEqual({
      position: 150, remaining: 450, percent: 25,
    });
    expect(resumablePodcastProgress(15, 600)?.percent).toBe(3);
  });
  it('never returns progress for invalid media metadata', () => {
    expect(resumablePodcastProgress(Number.NaN, 600)).toBeNull();
    expect(resumablePodcastProgress(30, Number.POSITIVE_INFINITY)).toBeNull();
    expect(resumablePodcastProgress(30, 0)).toBeNull();
  });
});
