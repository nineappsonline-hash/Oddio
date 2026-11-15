import { describe, expect, it } from 'vitest';
import type { PlaybackEventRecord, PlaybackSessionRecord } from './types';
import { buildQualifiedListeningHistory } from './listening-history';

const sessions: PlaybackSessionRecord[] = [
  { id: 'owned', userId: 'user-1', anonymousSessionHash: null, startedAt: '2026-01-01', lastSeenAt: '2026-01-01' },
  { id: 'other', userId: 'user-2', anonymousSessionHash: null, startedAt: '2026-01-01', lastSeenAt: '2026-01-01' },
  { id: 'guest', userId: null, anonymousSessionHash: 'anonymous', startedAt: '2026-01-01', lastSeenAt: '2026-01-01' },
];
function event(sessionId: string, trackId: string, kind: string, qualified: boolean, at: string): PlaybackEventRecord {
  return { id: `${sessionId}-${trackId}-${at}`, sessionId, trackId, eventType: kind, audibleMs: qualified ? 30000 : 1000, qualified, occurredAt: at, requestId: 'request' };
}

describe('private qualified listening history', () => {
  it('ignores short starts, anonymous activity and missing sessions', () => {
    const result = buildQualifiedListeningHistory(sessions, [
      event('owned', 'song-1', 'start', false, '2026-01-01'),
      event('guest', 'song-2', 'qualified', true, '2026-01-02'),
      event('missing', 'song-3', 'qualified', true, '2026-01-02'),
      event('owned', 'song-1', 'qualified', true, '2026-01-03'),
    ]);
    expect(result).toEqual([{ userId: 'user-1', trackId: 'song-1', playedAt: '2026-01-03' }]);
  });

  it('keeps each user separate and chooses the most recent qualified listen', () => {
    const result = buildQualifiedListeningHistory(sessions, [
      event('owned', 'shared', 'qualified', true, '2026-01-10'),
      event('owned', 'shared', 'qualified', true, '2026-01-03'),
      event('other', 'shared', 'qualified', true, '2026-01-11'),
      event('other', 'short', 'progress', false, '2026-01-12'),
    ]);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ userId: 'user-1', trackId: 'shared', playedAt: '2026-01-10' });
    expect(result).toContainEqual({ userId: 'user-2', trackId: 'shared', playedAt: '2026-01-11' });
  });
});
