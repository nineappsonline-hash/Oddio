import type { CatalogTrack } from './data/queries';

export type SmartPlaylistRule = {
  id: string;
  title: string;
  genreId: string;
  moodId: string;
  likedOnly: boolean;
};
export const smartPlaylistStorageKey = (userId: string) => 'oddio-smart-playlists-v1:' + userId;

export function validateSmartPlaylistRules(
  input: unknown,
  genres: readonly string[],
  moods: readonly string[],
): SmartPlaylistRule[] {
  if (!Array.isArray(input)) return [];
  const genreSet = new Set(genres);
  const moodSet = new Set(moods);
  const ids = new Set<string>();
  const validated: SmartPlaylistRule[] = [];
  for (const item of input.slice(0, 30)) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(obj.id) || ids.has(obj.id)) continue;
    if (typeof obj.title !== 'string' || !obj.title.trim() || obj.title.length > 70) continue;
    const genreId = typeof obj.genreId === 'string' && genreSet.has(obj.genreId) ? obj.genreId : '';
    const moodId = typeof obj.moodId === 'string' && moodSet.has(obj.moodId) ? obj.moodId : '';
    const likedOnly = obj.likedOnly === true;
    if (!genreId && !moodId && !likedOnly) continue;
    ids.add(obj.id);
    validated.push({ id: obj.id, title: obj.title.trim(), genreId, moodId, likedOnly });
    if (validated.length >= 12) break;
  }
  return validated;
}

export function evaluateSmartPlaylist(
  catalog: readonly CatalogTrack[],
  rule: SmartPlaylistRule,
  likedIds: ReadonlySet<string>,
  limit = 80,
): CatalogTrack[] {
  const maximum = Math.max(0, Math.min(80, Math.floor(limit)));
  return catalog.filter((track) =>
    track.access.listable &&
    track.access.allowed &&
    track.audio?.processingStatus === 'ready' &&
    (!rule.genreId || (track.genreIds?.length ? track.genreIds : [track.genreId]).includes(rule.genreId)) &&
    (!rule.moodId || track.moodIds.includes(rule.moodId)) &&
    (!rule.likedOnly || likedIds.has(track.id))
  ).sort((a, b) => b.releaseAt.localeCompare(a.releaseAt) || a.id.localeCompare(b.id))
    .slice(0, maximum);
}
