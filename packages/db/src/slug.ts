export function normalizeSlug(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
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
