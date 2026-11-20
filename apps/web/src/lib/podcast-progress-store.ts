import type { CatalogTrack } from '@/lib/data/queries';
import { isPodcastPlayback } from '@/lib/podcast-playback';

export interface SavedPodcastProgress {
  episodeId: string;
  seconds: number;
  duration: number;
  updatedAt: number;
  completed?: boolean;
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

export function mergePodcastProgress(
  local: readonly SavedPodcastProgress[],
  remote: readonly SavedPodcastProgress[],
): SavedPodcastProgress[] {
  const entries = new Map<string, SavedPodcastProgress>();
  for (const entry of [...remote, ...local]) {
    const current = entries.get(entry.episodeId);
    // Equal timestamps prefer local (same-device action).
    if (!current || entry.updatedAt >= current.updatedAt)
      entries.set(entry.episodeId, entry);
  }
  return [...entries.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, LIMIT);
}

export function readPodcastSyncRecords(viewerId: string | null): SavedPodcastProgress[] {
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
        if (
          typeof row.episodeId !== 'string' ||
          row.episodeId.length > 128 ||
          !row.episodeId ||
          typeof row.seconds !== 'number' ||
          !Number.isFinite(row.seconds) ||
          typeof row.duration !== 'number' ||
          !Number.isFinite(row.duration) ||
          row.duration <= 0 ||
          row.duration > MAX_SECONDS ||
          row.seconds < 0 ||
          row.seconds > row.duration ||
          typeof row.updatedAt !== 'number' ||
          !Number.isFinite(row.updatedAt) ||
          (row.completed !== undefined && typeof row.completed !== 'boolean')
        )
          return false;
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

export function readPodcastProgress(viewerId: string | null): SavedPodcastProgress[] {
  return readPodcastSyncRecords(viewerId).filter(
    (row) => !row.completed && row.seconds >= 15 && row.seconds < row.duration - 20,
  );
}

/** Save cloud results after merging them with any newer offline local activity. */
export function replacePodcastSyncRecords(
  viewerId: string | null,
  incoming: readonly SavedPodcastProgress[],
): void {
  const storage = storageFor(viewerId);
  if (!storage) return;
  try {
    const before = readPodcastSyncRecords(viewerId);
    const merged = mergePodcastProgress(before, incoming);
    // Avoid triggering a new upload on every successful cloud read-back.
    if (JSON.stringify(merged) === JSON.stringify(before)) return;
    storage.setItem(keyFor(viewerId), JSON.stringify(merged));
    window.dispatchEvent(new Event(PODCAST_PROGRESS_EVENT));
  } catch {
    /* Storage is optional. */
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
  const duration =
    Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : track.durationMs / 1000;
  if (
    !Number.isFinite(seconds) ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > MAX_SECONDS
  )
    return;
  const previous = readPodcastSyncRecords(viewerId).filter(
    (row) => row.episodeId !== track.id,
  );
  // Persist completions as tombstones, so another device cannot resurrect them.
  const completed = seconds >= duration - 20;
  if (seconds < 15 && !completed) return;
  const next = [
    {
      episodeId: track.id,
      seconds: Math.max(0, Math.min(seconds, duration)),
      duration,
      updatedAt: Date.now(),
      completed,
    },
    ...previous,
  ];
  try {
    storage.setItem(keyFor(viewerId), JSON.stringify(next.slice(0, LIMIT)));
    window.dispatchEvent(new Event(PODCAST_PROGRESS_EVENT));
  } catch {
    /* Local failure must never interrupt playback. */
  }
}

export function clearPodcastProgress(viewerId: string | null, episodeId: string): void {
  const storage = storageFor(viewerId);
  if (!storage) return;
  try {
    const original = readPodcastSyncRecords(viewerId);
    const existing = original.find((row) => row.episodeId === episodeId);
    // Keep a tombstone until both devices have received the completion/reset.
    if (!existing) return;
    storage.setItem(
      keyFor(viewerId),
      JSON.stringify(
        [
          {
            ...existing,
            completed: true,
            seconds: existing.duration,
            updatedAt: Date.now(),
          },
          ...original.filter((row) => row.episodeId !== episodeId),
        ].slice(0, LIMIT),
      ),
    );
    window.dispatchEvent(new Event(PODCAST_PROGRESS_EVENT));
  } catch {
    /* Storage is optional. */
  }
}

/** Mark an episode as listened or unplayed without deleting its sync tombstone.
 * A zero-position unplayed record is intentionally excluded from the history.
 * The last-write-wins cloud merge can therefore propagate both actions.
 */
export function setPodcastEpisodePlayed(
  viewerId: string | null,
  episodeId: string,
  durationSeconds: number,
  played: boolean,
): boolean {
  const storage = storageFor(viewerId);
  if (!storage || !episodeId || !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0 || durationSeconds > MAX_SECONDS) return false;
  const existing = readPodcastSyncRecords(viewerId);
  const old = existing.find((entry) => entry.episodeId === episodeId);
  // Use a strictly newer timestamp so a same-device action always wins
  // over its preceding saved playback position.
  const updatedAt = Math.max(Date.now(), (old?.updatedAt ?? 0) + 1);
  const next: SavedPodcastProgress = {
    episodeId,
    seconds: played ? durationSeconds : 0,
    duration: durationSeconds,
    completed: played,
    updatedAt,
  };
  try {
    storage.setItem(keyFor(viewerId), JSON.stringify([
      next,
      ...existing.filter((entry) => entry.episodeId !== episodeId),
    ].slice(0, LIMIT)));
    window.dispatchEvent(new Event(PODCAST_PROGRESS_EVENT));
    return true;
  } catch {
    return false;
  }
}

/** Hide untouched records; display unfinished and fully listened episodes. */
export function isVisiblePodcastHistoryEntry(entry: SavedPodcastProgress): boolean {
  return Boolean(entry.completed || entry.seconds >= 15);
}
