import type { CatalogTrack } from '@/lib/data/queries';
import type { RepeatMode } from './player-store';

export const PLAYER_SESSION_KEY = 'oddio-player-session-v1';
const MAX_QUEUE_ITEMS = 50;
const MAX_SAVED_POSITION_SECONDS = 4 * 60 * 60;

export interface SavedPlayerSession {
  version: 1;
  track: CatalogTrack | null;
  queue: CatalogTrack[];
  currentTime: number;
  volume: number;
  muted: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  autoplay: boolean;
}

function isCatalogTrack(value: unknown): value is CatalogTrack {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const track = value as Record<string, unknown>;
  const artwork = track.artwork;
  return typeof track.id === 'string' && track.id.length > 0 &&
    typeof track.title === 'string' && typeof track.slug === 'string' &&
    typeof track.durationMs === 'number' && Number.isFinite(track.durationMs) &&
    track.durationMs >= 0 && !!artwork && typeof artwork === 'object' &&
    typeof (artwork as Record<string, unknown>).accent === 'string';
}

export function parsePlayerSession(source: string | null): SavedPlayerSession | null {
  if (!source || source.length > 500_000) return null;
  try {
    const raw: unknown = JSON.parse(source);
    if (!raw || typeof raw !== 'object') return null;
    const session = raw as Record<string, unknown>;
    if (session.version !== 1) return null;
    const track = isCatalogTrack(session.track) ? session.track : null;
    if (!track) return null;
    const queue = Array.isArray(session.queue)
      ? session.queue.filter(isCatalogTrack).filter(
        (item: CatalogTrack, index: number, items: CatalogTrack[]) =>
          item.id !== track.id && items.findIndex((other) => other.id === item.id) === index,
      ).slice(0, MAX_QUEUE_ITEMS)
      : [];
    return {
      version: 1,
      track,
      queue,
      currentTime: typeof session.currentTime === 'number' && Number.isFinite(session.currentTime)
        ? Math.max(0, Math.min(session.currentTime, MAX_SAVED_POSITION_SECONDS, track.durationMs / 1000))
        : 0,
      volume: typeof session.volume === 'number' && Number.isFinite(session.volume)
        ? Math.max(0, Math.min(1, session.volume)) : 0.8,
      muted: session.muted === true,
      repeat: session.repeat === 'one' || session.repeat === 'all' ? session.repeat : 'off',
      shuffle: session.shuffle === true,
      autoplay: session.autoplay !== false,
    };
  } catch {
    return null;
  }
}

export function buildPlayerSession(state: SavedPlayerSession): SavedPlayerSession {
  return {
    version: 1,
    track: state.track,
    queue: state.queue.slice(0, MAX_QUEUE_ITEMS),
    currentTime: Math.max(0, Math.min(state.currentTime, MAX_SAVED_POSITION_SECONDS)),
    volume: state.volume,
    muted: state.muted,
    repeat: state.repeat,
    shuffle: state.shuffle,
    autoplay: state.autoplay,
  };
}
