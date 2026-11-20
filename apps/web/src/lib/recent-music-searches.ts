export const MAX_RECENT_MUSIC_SEARCHES = 8;
export const MAX_MUSIC_QUERY_LENGTH = 120;

/** Limit stored terms and preserve intentional most-recent-first ordering. */
export function sanitizeRecentMusicSearches(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const raw of value) {
    if (typeof raw !== 'string') continue;
    const item = raw.trim();
    if (!item || item.length > MAX_MUSIC_QUERY_LENGTH) continue;
    const key = item.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(item);
    if (terms.length >= MAX_RECENT_MUSIC_SEARCHES) break;
  }
  return terms;
}

export function addRecentMusicSearch(value: string, current: readonly string[]): string[] {
  const term = value.trim().slice(0, MAX_MUSIC_QUERY_LENGTH);
  if (!term) return [...current];
  return sanitizeRecentMusicSearches([term, ...current]);
}
