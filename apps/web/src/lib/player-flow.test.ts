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
    station: null,
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
    expect(state.queue.map((item) => item.id)).toEqual(['b']);
    expect(state.repeat).toBe('off');
    expect(state.shuffle).toBe(false);
    expect(state.playbackRequestId).toBeGreaterThan(previousRequestId);
  });

  it('continues a station without repeating its played tracks', () => {
    const a = track('a');
    const b = track('b');
    const c = track('c');
    usePlayer.getState().startFlow([a, b], { kind: 'flow' });
    usePlayer.getState().advance();
    expect(usePlayer.getState().advance()).toBe(false);
    usePlayer.getState().continueStation([a, b, c]);
    expect(usePlayer.getState().track?.id).toBe('c');
    expect(usePlayer.getState().history.map((item) => item.id)).toEqual(['a', 'b']);
    expect(usePlayer.getState().station?.kind).toBe('flow');
  });

  it('does not replace an active song while waiting on a station refresh', () => {
    usePlayer.getState().startFlow([track('a')], { kind: 'weekly' });
    usePlayer.getState().continueStation([track('b')]);
    expect(usePlayer.getState().track?.id).toBe('a');
  });

  it('does not erase a playing queue when no mix is available', () => {
    usePlayer.getState().play(track('a'), [track('b')]);
    usePlayer.getState().startFlow([]);
    expect(usePlayer.getState().queue.map((item) => item.id)).toEqual(['b']);
  });
});
