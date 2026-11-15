import { describe, expect, it } from 'vitest';
import {
  MAX_STREAM_RECOVERY_ATTEMPTS,
  recoverablePlaybackPosition,
  streamRecoveryDelayMs,
} from './player-stream-recovery';

describe('Cloudflare audio recovery policy', () => {
  it('allows two bounded retries and rejects an endless retry loop', () => {
    expect(MAX_STREAM_RECOVERY_ATTEMPTS).toBe(2);
    expect(streamRecoveryDelayMs(1)).toBe(1500);
    expect(streamRecoveryDelayMs(2)).toBe(3000);
    expect(streamRecoveryDelayMs(3)).toBeNull();
    expect(streamRecoveryDelayMs(0)).toBeNull();
    expect(streamRecoveryDelayMs(Number.NaN)).toBeNull();
  });

  it('restores the playback position without jumping back to the beginning', () => {
    expect(recoverablePlaybackPosition(73.25, 30, 240)).toBe(73.25);
    expect(recoverablePlaybackPosition(Number.NaN, 42, 240)).toBe(42);
    expect(recoverablePlaybackPosition(0, 72, 240)).toBe(72);
    expect(recoverablePlaybackPosition(300, 42, 240)).toBe(240);
    expect(recoverablePlaybackPosition(-1, -20, 240)).toBe(0);
  });
});
