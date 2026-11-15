/**
 * Recovery is deliberately bounded: repeated failures should surface a useful
 * player error, not generate unbounded auth requests or R2 operations.
 */
export const MAX_STREAM_RECOVERY_ATTEMPTS = 2;

export function streamRecoveryDelayMs(attempt: number): number | null {
  if (!Number.isSafeInteger(attempt) || attempt < 1 || attempt > MAX_STREAM_RECOVERY_ATTEMPTS) {
    return null;
  }
  return attempt * 1500;
}

export function recoverablePlaybackPosition(
  currentTime: number,
  fallbackTime: number,
  duration: number,
): number {
  // The HTML audio element may reset currentTime to zero when its source fails.\n  // In that case prefer the player store's latest meaningful position.\n  const mediaPositionIsUseful = Number.isFinite(currentTime) && currentTime > 0;\n  const point = mediaPositionIsUseful ? currentTime : fallbackTime;
  const safe = Number.isFinite(point) ? Math.max(0, point) : 0;
  return Number.isFinite(duration) && duration > 0 ? Math.min(safe, duration) : safe;
}
