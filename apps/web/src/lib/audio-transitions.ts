/** A gentle equal-power overlap; audio elements use the listener's current volume. */
export function crossfadeGains(remainingSeconds: number, durationSeconds: number) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return { outgoing: 1, incoming: 0 };
  }
  const fraction = Math.max(0, Math.min(1, 1 - Math.max(0, remainingSeconds) / durationSeconds));
  return {
    outgoing: Math.cos((Math.PI / 2) * fraction),
    incoming: Math.sin((Math.PI / 2) * fraction),
  };
}

/** Only prepare a known queued track; repeat-one, paused and stations are not
 * eligible for a speculative second stream. Never cache signed audio URLs. */
export function canPrepareNextTrack(args: {
  remainingSeconds: number;
  playing: boolean;
  repeatOne: boolean;
  queued: boolean;
}): boolean {
  return args.playing && !args.repeatOne && args.queued &&
    Number.isFinite(args.remainingSeconds) &&
    args.remainingSeconds > 0 && args.remainingSeconds <= 16;
}
