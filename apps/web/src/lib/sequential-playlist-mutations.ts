/**
 * Execute non-atomic playlist mutations in a defined order.
 *
 * Stop at the first failure. Callers must refresh authoritative server state
 * before retrying, since a lost response does not prove the mutation failed.
 */
export async function runSequentialPlaylistMutations<T>(
  items: readonly T[],
  mutate: (item: T) => Promise<unknown>,
  onProgress?: (completed: number, total: number) => void,
): Promise<{ completed: number; total: number; failed: boolean }> {
  let completed = 0;
  for (const item of items) {
    try {
      await mutate(item);
    } catch {
      return { completed, total: items.length, failed: true };
    }
    completed += 1;
    onProgress?.(completed, items.length);
  }
  return { completed, total: items.length, failed: false };
}
