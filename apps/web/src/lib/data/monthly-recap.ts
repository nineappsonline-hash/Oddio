import type { CatalogTrack } from './queries';
import type { PlaybackEventRecord, PlaybackSessionRecord } from './types';

export type RecapListen = CatalogTrack & { playedAt: string };

/** Privacy-first monthly summary of the user's accessible, qualified history. */
export function monthlyListeningRecap(
  listens: RecapListen[],
  year: number,
  month: number,
) {
  const start = Date.UTC(year, month - 1, 1);
  const end = Date.UTC(year, month, 1);
  const counts = new Map<string, { track: CatalogTrack; plays: number }>();
  const artistCounts = new Map<string, { name: string; plays: number }>();
  let qualifiedListens = 0;
  for (const listen of listens) {
    const at = Date.parse(listen.playedAt);
    if (!Number.isFinite(at) || at < start || at >= end) continue;
    qualifiedListens += 1;
    const current = counts.get(listen.id);
    counts.set(listen.id, {
      track: listen,
      plays: (current?.plays ?? 0) + 1,
    });
    const artist = artistCounts.get(listen.artistId);
    artistCounts.set(listen.artistId, {
      name: listen.artist?.name ?? 'Oddio Artist',
      plays: (artist?.plays ?? 0) + 1,
    });
  }
  const topTracks = [...counts.values()]
    .sort((a, b) => b.plays - a.plays || a.track.id.localeCompare(b.track.id))
    .slice(0, 5)
    .map(({ track, plays }) => ({ id: track.id, title: track.title, artist: track.artist?.name ?? 'Oddio Artist', plays }));
  const topArtists = [...artistCounts.entries()]
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => b.plays - a.plays || a.id.localeCompare(b.id))
    .slice(0, 5);
  return {
    year,
    month,
    qualifiedListens,
    uniqueTracks: counts.size,
    uniqueArtists: artistCounts.size,
    topTracks,
    topArtists,
  };
}

/** A library history row is only the latest listen per track. Use actual
 * qualified events to count repeats while retaining the library's current
 * access checks. Never expose session or listener IDs to the recap UI.
 */
export function qualifiedRecapEvents(
  accessibleHistory: RecapListen[],
  sessions: PlaybackSessionRecord[],
  events: PlaybackEventRecord[],
  userId: string,
): RecapListen[] {
  const accessible = new Map(accessibleHistory.map((item) => [item.id, item]));
  const ownedSessions = new Set(
    sessions.filter((session) => session.userId === userId).map((session) => session.id),
  );
  return events.flatMap((event) => {
    if (!event.qualified || event.eventType !== 'qualified' || !ownedSessions.has(event.sessionId)) {
      return [];
    }
    const track = accessible.get(event.trackId);
    return track ? [{ ...track, playedAt: event.occurredAt }] : [];
  });
}
