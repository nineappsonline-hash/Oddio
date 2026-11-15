'use client';

export interface DiscoveryExclusions {
  trackIds: string[];
  genreIds: string[];
}
export const preferenceKey = (userId: string | null) =>
  'oddio-discovery-exclusions-v1:' + (userId ?? 'guest');
export function readDiscoveryExclusions(userId: string | null): DiscoveryExclusions {
  if (typeof window === 'undefined') return { trackIds: [], genreIds: [] };
  try {
    const storage = userId ? window.localStorage : window.sessionStorage;
    const raw = storage.getItem(preferenceKey(userId));
    const parsed: unknown = JSON.parse(raw ?? '{}');
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid preferences');
    const obj = parsed as Record<string, unknown>;
    const clean = (items: unknown, max: number) =>
      Array.isArray(items) ? items.filter((id): id is string =>
        typeof id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id),
      ).slice(0, max) : [];
    return { trackIds: clean(obj.trackIds, 100), genreIds: clean(obj.genreIds, 50) };
  } catch {
    return { trackIds: [], genreIds: [] };
  }
}
export function saveDiscoveryExclusions(
  userId: string | null,
  exclusions: DiscoveryExclusions,
): void {
  if (typeof window === 'undefined') return;
  try {
    const storage = userId ? window.localStorage : window.sessionStorage;
    storage.setItem(preferenceKey(userId), JSON.stringify(exclusions));
    window.dispatchEvent(new Event('oddio-discovery-preferences-changed'));
  } catch {
    // The player continues if browser storage is disabled.
  }
}
