/** Shared normalization for Arabic / English music discovery.
 * This is conservative normalization, not a full transliteration engine.
 * Avoid transliterating proper names without authoritative aliases.
 */
export function normalizeMusicSearch(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function searchWords(value: string): string[] {
  return normalizeMusicSearch(value).split(' ').filter(Boolean);
}

export function matchesMusicSearch(haystack: string, words: string[]): boolean {
  if (words.length === 0) return true;
  const normalized = normalizeMusicSearch(haystack);
  return words.every((word) => normalized.includes(word));
}

/** Prefer exact track/artist matches over text buried in metadata. */
export function searchRelevanceScore(
  search: string,
  title: string,
  artistName: string,
  description = '',
): number {
  const term = normalizeMusicSearch(search);
  if (!term) return 0;
  const titleKey = normalizeMusicSearch(title);
  const artistKey = normalizeMusicSearch(artistName);
  const textKey = normalizeMusicSearch(description);
  if (titleKey === term) return 100;
  if (artistKey === term) return 80;
  if (titleKey.startsWith(term)) return 60;
  if (artistKey.startsWith(term)) return 50;
  if (titleKey.includes(term)) return 40;
  if (artistKey.includes(term)) return 30;
  if (textKey.includes(term)) return 10;
  return 0;
}
