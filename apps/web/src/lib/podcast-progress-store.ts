import type { CatalogTrack } from '@/lib/data/queries';
import { isPodcastPlayback } from '@/lib/podcast-playback';

export interface SavedPodcastProgress {
  episodeId: string;
  seconds: number;
  duration: number;
  updatedAt: number;
}

const PREFIX = 'oddio-podcast-progress-v1:';
const LIMIT = 40;
const MAX_SECONDS = 24 * 60 * 60;
export const PODCAST_PROGRESS_EVENT = 'oddio-podcast-progress-updated';

function storageFor(viewerId: string | null): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return viewerId ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function keyFor(viewerId: string | null) {
  return PREFIX + (viewerId ?? 'guest');
}

export function readPodcastProgress(viewerId: string | null): SavedPodcastProgress[] {
  try {
    const raw = storageFor(viewerId)?.getItem(keyFor(viewerId));
    if (!raw || raw.length > 20_000) return [];
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    return list
      .filter((item): item is SavedPodcastProgress => {
        if (!item || typeof item !== 'object') return false;
        const row = item as Record<string, unknown>;
        if (typeof row.episodeId !== 'string' || row.episodeId.length > 128 || !row.episodeId ||
            typeof row.seconds !== 'number' || !Number.isFinite(row.seconds) ||
            typeof row.duration !== 'number' || !Number.isFinite(row.duration) ||
            row.duration <= 0 || row.duration > MAX_SECONDS ||
            row.seconds < 15 || row.seconds >= row.duration - 20 ||
            typeof row.updatedAt !== 'number' || !Number.isFinite(row.updatedAt)) return false;
        if (seen.has(row.episodeId)) return false;
        seen.add(row.episodeId);
        return true;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, LIMIT);
  } catch {
    return [];
  }
}

export function savePodcastProgress(
  viewerId: string | null,
  track: CatalogTrack | null,
  seconds: number,
  durationSeconds: number,
): void {
  if (!track || !isPodcastPlayback(track)) return;
  const storage = storageFor(viewerId);
  if (!storage) return;
  const duration = Number.isFinite(durationSeconds) && durationSeconds > 0
    ? durationSeconds : track.durationMs / 1000;
  if (!Number.isFinite(seconds) || !Number.isFinite(duration) || duration <= 0) return;
  const previous = readPodcastProgress(viewerId).filter((row) => row.episodeId !== track.id);
  // Completion clears the episode; brief starts don't erase older progress.
  const completed = seconds >= duration - 20;
  const next = seconds >= 15 && !completed && duration <= MAX_SECONDS
    ? [{ episodeId: track.id, seconds: Math.min(seconds, duration), duration, updatedAt: Date.now() }, ...previous]
    : previous;
  try {
    storage.setItem(keyFor(viewerId), JSON.stringify(next.slice(0, LIMIT)));
    window.dispatchEvent(new Event(PODCAST_PROGRESS_EVENT));
  } catch {
    // Nonessential preference persistence must never interrupt audio.
  }
}

export function clearPodcastProgress(viewerId: string | null, episodeId: string): void {
  const storage = storageFor(viewerId);
  if (!storage) return;
  try {
    storage.setItem(keyFor(viewerId), JSON.stringify(
      readPodcastProgress(viewerId).filter((row) => row.episodeId !== episodeId),
    ));
    window.dispatchEvent(new Event(PODCAST_PROGRESS_EVENT));
  } catch { /* Storage is optional. */ }
}
