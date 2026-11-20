/** Keyboard movement between suggestion links; -1 means search input. */
export function nextSuggestionFocusIndex(
  current: number,
  direction: 'down' | 'up',
  count: number,
): number {
  if (count <= 0) return -1;
  if (direction === 'down') return Math.min(current + 1, count - 1);
  return Math.max(-1, current - 1);
}
