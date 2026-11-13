import { describe, expect, it } from 'vitest';
import type { CatalogTrack } from './data/queries';
import { buildPlayerSession, parsePlayerSession } from './player-session';

const track = {
  id: 'song-1',
  title: 'Test Song',
  slug: 'test-song',
  durationMs: 180_000,
  artwork: { accent: '#EAB997', url: '' },
};
const next = { ...track, id: 'song-2', slug: 'next-song' };

describe('Oddio saved player session', () => {
  it('rejects missing, invalid or mismatched snapshots', () => {
    expect(parsePlayerSession(null)).toBeNull();
    expect(parsePlayerSession('{')).toBeNull();
    expect(parsePlayerSession(JSON.stringify({ version: 2, track }))).toBeNull();
    expect(
      parsePlayerSession(JSON.stringify({ version: 1, track: { id: 1 } })),
    ).toBeNull();
  });

  it('restores a valid session and never saves playback as active', () => {
    const data = {
      version: 1 as const,
      track: track as unknown as CatalogTrack,
      queue: [
        next as unknown as CatalogTrack,
        next as unknown as CatalogTrack,
        track as unknown as CatalogTrack,
      ],
      currentTime: 48,
      volume: 0.4,
      muted: false,
      repeat: 'all' as const,
      shuffle: false,
      autoplay: true,
    };
    const restored = parsePlayerSession(JSON.stringify(buildPlayerSession(data)));
    expect(restored?.track?.id).toBe('song-1');
    expect(restored?.queue.map((item) => item.id)).toEqual(['song-2']);
    expect(restored?.currentTime).toBe(48);
    expect(restored?.repeat).toBe('all');
    expect('isPlaying' in (restored ?? {})).toBe(false);
  });

  it('clamps untrusted saved values', () => {
    const result = parsePlayerSession(
      JSON.stringify({
        version: 1,
        track,
        queue: [],
        currentTime: 10_000,
        volume: 8,
        repeat: 'invalid',
        autoplay: false,
      }),
    );
    expect(result?.currentTime).toBe(180);
    expect(result?.volume).toBe(1);
    expect(result?.repeat).toBe('off');
    expect(result?.autoplay).toBe(false);
  });
});
