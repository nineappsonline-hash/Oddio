/** Estimate a host's playback position from server timestamps, without trusting device clock. */
export function roomSyncedPosition(args: {
  seconds: number;
  playing: boolean;
  syncedAt: string;
  serverNow: string;
  elapsedClientMs: number;
  durationSeconds?: number;
}): number {
  const base = Number.isFinite(args.seconds) ? Math.max(0, args.seconds) : 0;
  const offset = args.playing
    ? Math.max(0, (Date.parse(args.serverNow) - Date.parse(args.syncedAt)) / 1000 || 0) +
      Math.max(0, args.elapsedClientMs / 1000)
    : 0;
  const result = base + offset;
  return typeof args.durationSeconds === 'number' &&
    Number.isFinite(args.durationSeconds) &&
    args.durationSeconds > 0
    ? Math.min(result, args.durationSeconds)
    : result;
}

/** Avoid seek loops caused by small network/decoder timing differences. */
export function roomShouldSeek(localSeconds: number, targetSeconds: number) {
  return !Number.isFinite(localSeconds) || Math.abs(localSeconds - targetSeconds) > 2.5;
}
