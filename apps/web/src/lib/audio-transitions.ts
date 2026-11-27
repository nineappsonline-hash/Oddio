/** A gentle equal-power overlap; audio elements use the listener's current volume. */
export function crossfadeGains(remainingSeconds: number, durationSeconds: number) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return { outgoing: 1, incoming: 0 };
  }
  const fraction = Math.max(
    0,
    Math.min(1, 1 - Math.max(0, remainingSeconds) / durationSeconds),
  );
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
  return (
    args.playing &&
    !args.repeatOne &&
    args.queued &&
    Number.isFinite(args.remainingSeconds) &&
    args.remainingSeconds > 0 &&
    args.remainingSeconds <= 16
  );
}


/**
 * A speculative audio authorization or async play() completion is valid only
 * while the exact source/next-track pair that requested it remains active.
 * Matching a queued ID alone is not enough: the listener may have selected
 * another song or paused while the asynchronous operation was in flight.
 */
export function isActiveAudioTransition(args: {
  sourceTrackId: string | null;
  nextTrackId: string;
  activeTrackId: string | null;
  activeNextTrackId: string | null;
  playing: boolean;
}): boolean {
  return (
    Boolean(args.sourceTrackId) &&
    Boolean(args.nextTrackId) &&
    args.playing &&
    args.activeTrackId === args.sourceTrackId &&
    args.activeNextTrackId === args.nextTrackId
  );
}
