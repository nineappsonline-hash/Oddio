export function idFromSegment(segment: string): string {
  const candidate = segment.slice(0, 36);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate)) {
    return candidate;
  }
  return decodeURIComponent(segment);
}

export function trackHref(track: { id: string; slug: string }): string {
  return `/tracks/${track.id}-${track.slug}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function truncate(value: string, length = 160): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1).trimEnd()}…`;
}
