import { describe, expect, it } from 'vitest';
import { roomShouldSeek, roomSyncedPosition } from './room-playback-sync';

describe('listening room clock-safe synchronization', () => {
  const base = {
    seconds: 40,
    syncedAt: '2026-11-15T12:00:00.000Z',
    serverNow: '2026-11-15T12:00:04.000Z',
    elapsedClientMs: 1500,
  };
  it('projects playing time using server clock even if device time is wrong', () => {
    expect(roomSyncedPosition({ ...base, playing: true })).toBe(45.5);
  });
  it('does not advance a paused room', () => {
    expect(roomSyncedPosition({ ...base, playing: false })).toBe(40);
  });
  it('caps at track duration and ignores network/clock skew backwards', () => {
    expect(roomSyncedPosition({ ...base, playing: true, durationSeconds: 43 })).toBe(43);
    expect(
      roomSyncedPosition({
        ...base,
        playing: true,
        elapsedClientMs: -10000,
        serverNow: '2026-11-15T11:59:59.000Z',
      }),
    ).toBe(40);
  });
  it('does not thrash audio seeks for normal drift', () => {
    expect(roomShouldSeek(45, 46.9)).toBe(false);
    expect(roomShouldSeek(45, 48)).toBe(true);
    expect(roomShouldSeek(Number.NaN, 20)).toBe(true);
  });
});
