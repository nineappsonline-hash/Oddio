import { beforeEach, describe, expect, it } from 'vitest';
import type { CatalogTrack } from '@/lib/data/queries';
import { usePlayer } from './player-store';

// Only the fields used by queue actions are required for these unit tests.
const track = (id: string) => ({ id, title: id, durationMs: 60_000, artwork: { accent: '#000' } }) as CatalogTrack;
const a = track('a');
const b = track('b');
const c = track('c');

const ids = () => usePlayer.getState().queue.map((item) => item.id);

describe('reversible queue edits', () => {
  beforeEach(() => {
    usePlayer.setState({
      track: a, queue: [b, c], history: [], queueUndo: null, isPlaying: false,
      currentTime: 0, duration: 60, shuffle: false, repeat: 'off', station: null,
    });
  });

  it('undoes removal, but not an invalid removal', () => {
    usePlayer.getState().removeFromQueue('b');
    expect(ids()).toEqual(['c']);
    usePlayer.getState().undoQueue();
    expect(ids()).toEqual(['b', 'c']);
    expect(usePlayer.getState().queueUndo).toBeNull();

    usePlayer.getState().removeFromQueue('missing');
    expect(usePlayer.getState().queueUndo).toBeNull();
  });

  it('undoes clear even when the queue becomes empty', () => {
    usePlayer.getState().clearQueue();
    expect(ids()).toEqual([]);
    usePlayer.getState().undoQueue();
    expect(ids()).toEqual(['b', 'c']);
    usePlayer.getState().clearQueue();
    usePlayer.getState().clearQueue();
    usePlayer.getState().undoQueue();
    expect(ids()).toEqual(['b', 'c']);
  });

  it('undoes both drag-reorder and accessible up/down move', () => {
    usePlayer.getState().reorderQueue(0, 1);
    expect(ids()).toEqual(['c', 'b']);
    usePlayer.getState().undoQueue();
    expect(ids()).toEqual(['b', 'c']);
    usePlayer.getState().moveInQueue('c', 'up');
    expect(ids()).toEqual(['c', 'b']);
    usePlayer.getState().undoQueue();
    expect(ids()).toEqual(['b', 'c']);
  });

  it('does not restore obsolete queue snapshots after advancing playback', () => {
    usePlayer.getState().clearQueue();
    usePlayer.getState().addToQueue(b);
    expect(usePlayer.getState().queueUndo).toBeNull();

    usePlayer.getState().removeFromQueue('b');
    usePlayer.getState().addToQueue(b);
    usePlayer.getState().next();
    usePlayer.getState().undoQueue();
    expect(usePlayer.getState().track?.id).toBe('b');
    expect(ids()).toEqual([]);
  });

  it('does not overwrite subsequent queue additions when Undo is clicked', () => {
    usePlayer.getState().removeFromQueue('b');
    usePlayer.getState().addToQueue(b);
    usePlayer.getState().undoQueue();
    expect(ids()).toEqual(['c', 'b']);
  });
});
