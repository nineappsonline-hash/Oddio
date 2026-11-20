/** Decide whether a saved podcast playback position qualifies for a resume card. */
export function resumablePodcastProgress(
  currentTime: number,
  duration: number,
): { position: number; remaining: number; percent: number } | null {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return null;
  const position = Math.max(0, Math.min(duration, currentTime));
  const remaining = Math.max(0, duration - position);
  // Don't promote an episode that has barely started or is essentially finished.
  if (position < 15 || remaining <= 20) return null;
  return {
    position,
    remaining: Math.ceil(remaining),
    percent: Math.max(0, Math.min(100, Math.round((position / duration) * 100))),
  };
}
