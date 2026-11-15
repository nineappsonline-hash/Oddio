import { describe, expect, it } from 'vitest';
import { crossfadeGains, canPrepareNextTrack } from './audio-transitions';

describe('audio transition safety', () => {
  it('uses equal power with correct start and end amplitudes', () => {
    const start = crossfadeGains(5, 5);
    const middle = crossfadeGains(2.5, 5);
    const end = crossfadeGains(0, 5);
    expect(start.outgoing).toBeCloseTo(1);
    expect(start.incoming).toBeCloseTo(0);
    expect(middle.outgoing ** 2 + middle.incoming ** 2).toBeCloseTo(1);
    expect(end.outgoing).toBeCloseTo(0);
    expect(end.incoming).toBeCloseTo(1);
  });
  it('does not prepare a speculative stream while paused or repeating one', () => {
    expect(
      canPrepareNextTrack({
        remainingSeconds: 10,
        playing: true,
        repeatOne: false,
        queued: true,
      }),
    ).toBe(true);
    expect(
      canPrepareNextTrack({
        remainingSeconds: 10,
        playing: false,
        repeatOne: false,
        queued: true,
      }),
    ).toBe(false);
    expect(
      canPrepareNextTrack({
        remainingSeconds: 10,
        playing: true,
        repeatOne: true,
        queued: true,
      }),
    ).toBe(false);
    expect(
      canPrepareNextTrack({
        remainingSeconds: 10,
        playing: true,
        repeatOne: false,
        queued: false,
      }),
    ).toBe(false);
    expect(
      canPrepareNextTrack({
        remainingSeconds: Number.NaN,
        playing: true,
        repeatOne: false,
        queued: true,
      }),
    ).toBe(false);
  });
});
