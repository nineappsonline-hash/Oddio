/**
 * Validate a playlist reorder against the order that the editor opened.
 * No missing/duplicate tracks or implicit additions/removals are allowed.
 * A stale editor must refresh before they can reorder again.
 */
export function isValidPlaylistReorder(
  existing: readonly string[],
  expected: readonly string[],
  proposed: readonly string[],
): boolean {
  if (existing.length !== expected.length || existing.length !== proposed.length) return false;
  const members = new Set(existing);
  if (members.size !== existing.length ||
      new Set(expected).size !== expected.length ||
      new Set(proposed).size !== proposed.length) return false;
  return existing.every((id, index) => id === expected[index]) &&
    proposed.every((id) => members.has(id));
}
