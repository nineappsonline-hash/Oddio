import type { PlaybackEventRecord, PlaybackSessionRecord } from './types';

export interface ListeningHistoryEntry {
  userId: string;
  trackId: string;
  playedAt: string;
}

/**
 * One qualified, most-recent listen per user/track. Unqualified starts and
 * anonymous activity must never enter an authenticated user's library.
 * Derived only from events; deleting the visible list does not erase events.
 */
export function buildQualifiedListeningHistory(
  sessions: PlaybackSessionRecord[],
  events: PlaybackEventRecord[],
): ListeningHistoryEntry[] {
  const sessionOwners = new Map(sessions.map((session) => [session.id, session.userId]));
  const latest = new Map<string, ListeningHistoryEntry>();
  for (const event of events) {
    if (event.eventType !== 'qualified' || !event.qualified) continue;
    const userId = sessionOwners.get(event.sessionId);
    if (!userId) continue;
    const key = `${userId}:${event.trackId}`;
    const previous = latest.get(key);
    if (!previous || event.occurredAt > previous.playedAt) {
      latest.set(key, { userId, trackId: event.trackId, playedAt: event.occurredAt });
    }
  }
  return Array.from(latest.values());
}
