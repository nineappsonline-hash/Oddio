/** A stable, non-mutating move shared by queue and editable lists. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) ||
    from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) {
    return [...items];
  }
  const next = [...items];
  const [selected] = next.splice(from, 1);
  if (selected === undefined) return [...items];
  next.splice(to, 0, selected);
  return next;
}
