import { describe, expect, it, vi } from 'vitest';
import { runSequentialPlaylistMutations } from './sequential-playlist-mutations';

describe('sequential playlist mutations', () => {
  it('preserves order and reports progress on success', async () => {
    const called: number[] = [];
    const progress: string[] = [];
    const result = await runSequentialPlaylistMutations(
      [2, 1, 3],
      async (item) => {
        called.push(item);
      },
      (completed, total) => progress.push(`${completed}/${total}`),
    );
    expect(called).toEqual([2, 1, 3]);
    expect(progress).toEqual(['1/3', '2/3', '3/3']);
    expect(result).toEqual({ completed: 3, total: 3, failed: false });
  });

  it('stops on network error without replaying a potentially committed item', async () => {
    const mutate = vi.fn(async (id: string) => {
      if (id === 'second') throw new Error('network disconnected');
    });
    const result = await runSequentialPlaylistMutations(
      ['first', 'second', 'third'],
      mutate,
    );
    expect(mutate.mock.calls.map(([id]) => id)).toEqual(['first', 'second']);
    expect(result).toEqual({ completed: 1, total: 3, failed: true });
  });

  it('handles an empty selection without network calls', async () => {
    const mutate = vi.fn(async () => {});
    expect(await runSequentialPlaylistMutations([], mutate)).toEqual({
      completed: 0,
      total: 0,
      failed: false,
    });
    expect(mutate).not.toHaveBeenCalled();
  });
});
