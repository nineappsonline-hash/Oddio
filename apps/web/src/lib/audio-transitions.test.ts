import { describe, expect, it } from 'vitest';
import { crossfadeGains, canPrepareNextTrack, isActiveAudioTransition } from './audio-transitions';

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

describe('stale async playback transitions', () => {
  const candidate = {
    sourceTrackId: 'song-a',
    nextTrackId: 'song-b',
    activeTrackId: 'song-a',
    activeNextTrackId: 'song-b',
    playing: true,
  };

  it('accepts a prefetched transition only for its unchanged song pair', () => {
    expect(isActiveAudioTransition(candidate)).toBe(true);
  });

  it('rejects a warmup response after the listener changes the current song', () => {
    expect(isActiveAudioTransition({ ...candidate, activeTrackId: 'song-c' })).toBe(
      false,
    );
  });

  it('rejects a crossfade play promise after pause or queue replacement', () => {
    expect(isActiveAudioTransition({ ...candidate, playing: false })).toBe(false);
    expect(
      isActiveAudioTransition({ ...candidate, activeNextTrackId: 'song-d' }),
    ).toBe(false);
  });

  it('rejects a transition that no longer has an active source or target', () => {
    expect(isActiveAudioTransition({ ...candidate, sourceTrackId: null })).toBe(
      false,
    );
    expect(isActiveAudioTransition({ ...candidate, activeNextTrackId: null })).toBe(
      false,
    );
  });
});
