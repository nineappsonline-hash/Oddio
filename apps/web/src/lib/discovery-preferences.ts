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
      Array.isArray(items)
        ? items
            .filter(
              (id): id is string =>
                typeof id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id),
            )
            .slice(0, max)
        : [];
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

const inflightHydration = new Map<string, Promise<boolean>>();
const pendingSaves = new Map<string, Promise<boolean>>();

function uniq(items: string[], cap: number): string[] {
  return [...new Set(items)].slice(-cap);
}
type PreferenceResponse = {
  data?: DiscoveryExclusions & { available?: boolean; saved?: boolean };
};

/** Sign-in reconciliation: merge legacy local exclusions once; subsequent visits
 * honor the latest server state so explicit remote resets are respected.
 * A missing staging migration gracefully keeps the current local setting.
 */
export async function hydrateDiscoveryExclusions(userId: string | null): Promise<boolean> {
  if (!userId || typeof window === 'undefined') return false;
  const previous = inflightHydration.get(userId);
  if (previous) return previous;
  const hydration = (async () => {
    try {
      const response = await fetch('/api/discovery/preferences', {
        credentials: 'same-origin', cache: 'no-store',
      });
      if (!response.ok) return false;
      const payload = (await response.json()) as PreferenceResponse;
      if (!payload.data?.available) return false;
      const remote = payload.data;
      const key = preferenceKey(userId) + ':synced';
      const local = readDiscoveryExclusions(userId);
      const merged: DiscoveryExclusions =
        window.localStorage.getItem(key) === '1'
          ? { trackIds: remote.trackIds, genreIds: remote.genreIds }
          : {
              trackIds: uniq([...remote.trackIds, ...local.trackIds], 100),
              genreIds: uniq([...remote.genreIds, ...local.genreIds], 50),
            };
      saveDiscoveryExclusions(userId, merged);
      // Persist one-time legacy preferences before considering this client synced.
      if (merged.trackIds.join(',') !== remote.trackIds.join(',') ||
          merged.genreIds.join(',') !== remote.genreIds.join(',')) {
        if (!await persistDiscoveryExclusions(userId, merged)) return false;
      }
      window.localStorage.setItem(key, '1');
      return true;
    } catch {
      return false;
    }
  })();
  inflightHydration.set(userId, hydration);
  try { return await hydration; }
  finally { inflightHydration.delete(userId); }
}

/** Serializes writes from this tab; always sends the latest saved browser value. */
export function persistDiscoveryExclusions(
  userId: string | null,
  exclusions: DiscoveryExclusions,
): Promise<boolean> {
  if (!userId || typeof window === 'undefined') return Promise.resolve(false);
  saveDiscoveryExclusions(userId, exclusions);
  const previous = pendingSaves.get(userId) ?? Promise.resolve(false);
  const write = previous.catch(() => false).then(async () => {
    try {
      const latest = readDiscoveryExclusions(userId);
      const response = await fetch('/api/discovery/preferences', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(latest),
      });
      if (!response.ok) return false;
      const payload = (await response.json()) as PreferenceResponse;
      const saved = payload.data?.saved === true;
      if (saved) window.localStorage.setItem(preferenceKey(userId) + ':synced', '1');
      return saved;
    } catch { return false; }
  });
  pendingSaves.set(userId, write);
  void write.finally(() => {
    if (pendingSaves.get(userId) === write) pendingSaves.delete(userId);
  });
  return write;
}
