export function normalizeSlug(input: string): string {
  const ascii = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 64);
  // Database slugs only allow ASCII. Preserve distinct non-Latin titles via a stable suffix.
  if (!/[^\x00-\x7F]/.test(input)) return ascii;
  let hash = 2166136261;
  for (const char of input.normalize('NFKC')) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 16777619);
  }
  return `${ascii || 'track'}-${(hash >>> 0).toString(36)}`;
}

export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const normalized = normalizeSlug(base) || 'untitled';
  const used = new Set(taken);
  if (!used.has(normalized)) return normalized;
  let suffix = 2;
  while (used.has(`${normalized}-${suffix}`)) suffix += 1;
  return `${normalized}-${suffix}`;
}

export function trackPath(id: string, slug: string): string {
  return `/tracks/${id}-${normalizeSlug(slug)}`;
}

export function albumPath(id: string, title: string): string {
  return `/albums/${id}-${normalizeSlug(title)}`;
}

export function playlistPath(id: string, title: string): string {
  return `/playlists/${id}-${normalizeSlug(title)}`;
}

export function parseIdSlug(segment: string): { id: string; slug: string } {
  const index = segment.indexOf('-');
  if (index === -1) return { id: segment, slug: '' };
  return { id: segment.slice(0, index), slug: segment.slice(index + 1) };
}
