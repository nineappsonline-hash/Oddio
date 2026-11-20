import type { Viewer } from '@ai-music/db';
import type { DemoDb } from './types';
import { listableTracks, type CatalogTrack } from './queries';

export function getRecentHomeTracks(
  db: DemoDb,
  viewer: Viewer,
  limit = 8,
): CatalogTrack[] {
  if (!viewer.userId) return [];
  const available = new Map(
    listableTracks(db, viewer)
      .filter(
        (track) => Boolean(track.audio) && track.audio?.processingStatus === 'ready',
      )
      .map((track) => [track.id, track]),
  );
  const sessions = new Set(
    db.playbackSessions
      .filter((session) => session.userId === viewer.userId)
      .map((session) => session.id),
  );
  const events = db.playbackEvents
    .filter((event) => sessions.has(event.sessionId) && event.eventType !== 'error')
    .map((event) => ({ trackId: event.trackId, at: event.occurredAt }));
  const history = db.history
    .filter((item) => item.userId === viewer.userId)
    .map((item) => ({ trackId: item.trackId, at: item.playedAt }));
  const seen = new Set<string>();
  const result: CatalogTrack[] = [];
  for (const event of [...events, ...history].sort((a, b) => b.at.localeCompare(a.at))) {
    if (seen.has(event.trackId)) continue;
    seen.add(event.trackId);
    const track = available.get(event.trackId);
    if (track) result.push(track);
    if (result.length >= limit) break;
  }
  return result;
}
