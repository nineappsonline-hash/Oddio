export interface ChartPoint {
  trackId: string;
  qualifiedPlays: number;
  uniqueListeners: number;
  completedRate?: number;
}

export interface ChartEntry {
  trackId: string;
  score: number;
  qualifiedPlays: number;
  rank: number;
}

/**
 * Ranking intentionally uses qualified plays plus a small completion bonus and
 * a log-dampened listener term so a single heavy listener cannot dominate.
 */
export function scoreChartPoint(point: ChartPoint): number {
  if (point.qualifiedPlays <= 0) return 0;
  const completion = Math.min(Math.max(point.completedRate ?? 0, 0), 1);
  const base = point.qualifiedPlays * (1 + 0.25 * completion);
  const diversity = Math.log2(1 + Math.max(point.uniqueListeners, 0));
  return Number((base + diversity).toFixed(4));
}

export function buildChart(points: ChartPoint[]): ChartEntry[] {
  return points
    .map((point) => ({
      trackId: point.trackId,
      qualifiedPlays: point.qualifiedPlays,
      score: scoreChartPoint(point),
    }))
    .filter((entry) => entry.qualifiedPlays > 0 && entry.score > 0)
    .sort((a, b) => b.score - a.score || a.trackId.localeCompare(b.trackId))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export interface PlaybackSample {
  trackId: string;
  sessionId: string;
  audibleMs: number;
  durationMs: number;
  occurredAt: string;
}

/**
 * Qualifies audible time and deduplicates to one play per track per session.
 * Seek/loop padding is handled upstream; this guard catches replay loops.
 */
export function qualifiedPlays(
  samples: PlaybackSample[],
  now: Date = new Date(),
): number {
  const seen = new Set<string>();
  let count = 0;
  for (const sample of samples) {
    const key = `${sample.sessionId}:${sample.trackId}`;
    if (seen.has(key)) continue;
    const threshold = Math.min(30_000, Math.max(sample.durationMs, 0));
    if (threshold === 0) continue;
    if (sample.audibleMs >= threshold) {
      if (new Date(sample.occurredAt).getTime() <= now.getTime()) {
        seen.add(key);
        count += 1;
      }
    }
  }
  return count;
}

export function isSuspiciousRepeat(
  samples: PlaybackSample[],
  windowMinutes = 10,
): boolean {
  if (samples.length < 8) return false;
  const sorted = [...samples].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
  const first = new Date(sorted[0]!.occurredAt).getTime();
  const last = new Date(sorted[sorted.length - 1]!.occurredAt).getTime();
  return last - first <= windowMinutes * 60_000;
}
