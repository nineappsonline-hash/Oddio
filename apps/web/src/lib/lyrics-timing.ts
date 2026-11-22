/** Synchronised lyrics cues are sorted by start. Binary search avoids scanning
 * every cue for every player progress event on mobile devices.
 * A seek into a gap must return -1, never the previous lyric.
 */
export type TimedLyricCue = { start: number; end: number; text: string };

export function activeLyricCueIndex(cues: readonly TimedLyricCue[], seconds: number): number {
  if (!Number.isFinite(seconds) || cues.length === 0) return -1;
  let low = 0;
  let high = cues.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (cues[mid]!.start <= seconds) low = mid + 1;
    else high = mid;
  }
  const index = low - 1;
  if (index < 0) return -1;
  const cue = cues[index]!;
  return seconds >= cue.start && seconds < cue.end ? index : -1;
}
