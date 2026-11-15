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

/**
 * Return true when two normalized words differ by at most one inserted,
 * deleted or substituted character. Restrict fuzzy matching to 5+ characters
 * so short queries and artist initials do not produce broad false positives.
 */
function oneEditAway(query: string, candidate: string): boolean {
  if (query.length < 5 || candidate.length < 4) return false;
  if (Math.abs(query.length - candidate.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < query.length && j < candidate.length) {
    if (query[i] === candidate[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (query.length > candidate.length) i++;
    else if (query.length < candidate.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + Number(i < query.length || j < candidate.length) <= 1;
}

export function matchesMusicSearch(haystack: string, words: string[]): boolean {
  if (words.length === 0) return true;
  const normalized = normalizeMusicSearch(haystack);
  // Fast exact path avoids allocating candidate words for ordinary searches.
  if (words.every((word) => normalized.includes(word))) return true;
  const candidates = normalized.split(' ');
  return words.every(
    (word) =>
      normalized.includes(word) ||
      candidates.some((candidate) => oneEditAway(word, candidate)),
  );
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
