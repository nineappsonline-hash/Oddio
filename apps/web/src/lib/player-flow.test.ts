import { beforeEach, describe, expect, it } from 'vitest';
import type { CatalogTrack } from '@/lib/data/queries';
import { usePlayer } from './player-store';

const track = (id: string) =>
  ({ id, title: id, artistId: id, durationMs: 120000 }) as CatalogTrack;

beforeEach(() => {
  usePlayer.setState({
    track: null,
    queue: [],
    history: [],
    isPlaying: false,
    repeat: 'off',
    shuffle: false,
    autoplay: true,
    currentTime: 0,
    error: null,
  });
});

describe('Oddio Flow queue', () => {
  it('starts a deduplicated ordered mix and advances to the next track', () => {
    const a = track('a');
    const b = track('b');
    usePlayer.getState().startFlow([a, b, a]);
    expect(usePlayer.getState().track?.id).toBe('a');
    expect(usePlayer.getState().queue.map((item) => item.id)).toEqual(['b']);
    expect(usePlayer.getState().isPlaying).toBe(true);
    expect(usePlayer.getState().advance()).toBe(true);
    expect(usePlayer.getState().track?.id).toBe('b');
  });

  it('replaces an existing queue even if the first track is already playing', () => {
    const a = track('a');
    const b = track('b');
    usePlayer.getState().play(a, [track('old')]);
    usePlayer.setState({ repeat: 'one', shuffle: true });
    const previousRequestId = usePlayer.getState().playbackRequestId;
    usePlayer.getState().startFlow([a, b]);
    const state = usePlayer.getState();
    expect(state.queue.map((item) => item.id).toEqual(['b']);
    expect(state.repeat).toBe('off');
    expect(state.shuffle).toBe(false);
    expect(state.playbackRequestId).toBeGreaterThan(previousRequestId);
  });

  it('does not erase a playing queue when no mix is available', () => {
    usePlayer.getState().play(track('a'), [track('b')]);
    usePlayer.getState().startFlow([]);
    expect(usePlayer.getState().queue.map((item) => item.id).toEqual(['b']);
  });
});
