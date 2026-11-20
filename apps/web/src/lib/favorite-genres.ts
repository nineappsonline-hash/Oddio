export const favoriteGenresKey = (userId: string) =>
  'oddio-home-favorite-genres-v1:' + userId;

export function normalizeFavoriteGenres(value: unknown, available: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(available);
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && allowed.has(id)))].slice(0, 3);
}
