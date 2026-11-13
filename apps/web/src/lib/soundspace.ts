import type { CatalogTrack } from '@/lib/data/queries';

export type SoundspaceMood = 'all' | 'calm' | 'energy' | 'night' | 'nostalgia';
export type DiscoveryLevel = 'familiar' | 'balanced' | 'surprise';

export const moodKeywords: Record<SoundspaceMood, string[]> = {
  all: [],
  calm: ['calm', 'ambient', 'peaceful', 'focus', 'هادئ', 'استرخاء'],
  energy: ['energetic', 'euphoric', 'dance', 'upbeat', 'حيوي', 'نشوة'],
  night: ['nocturnal', 'mysterious', 'night', 'ليلي', 'غامض'],
  nostalgia: ['nostalgic', 'melancholic', 'memory', 'حنين'],
};

export interface SoundspacePick {
  track: CatalogTrack;
  why: 'mood' | 'popular' | 'new' | 'explore';
}

/** Deterministic, explainable first-generation selection, not a trained recommender.
 * Must only receive tracks that are already listable for this viewer.
 */
export function buildSoundspace(
  tracks: CatalogTrack[],
  mood: SoundspaceMood,
  discovery: DiscoveryLevel,
  count = 12,
): SoundspacePick[] {
  const labels = moodKeywords[mood];
  const filtered = tracks.filter((track) => {
    if (mood === 'all') return true;
    const haystack = [
      track.genre?.slug ?? '', track.genre?.labelEn ?? '', track.genre?.labelAr ?? '',
      ...(track.moods ?? []).flatMap((item) => [item.slug, item.labelEn, item.labelAr]),
    ].join(' ').toLowerCase();
    return labels.some((label) => haystack.includes(label));
  });
  const maxPlays = Math.max(1, ...filtered.map((track) => track.qualifiedPlays));
  const newest = Math.max(1, ...filtered.map((track) => Date.parse(track.releaseAt) || 0));
  const oldest = Math.min(newest, ...filtered.map((track) => Date.parse(track.releaseAt) || newest));
  const score = (track: CatalogTrack): number => {
    const familiarity = Math.log1p(Math.max(0, track.qualifiedPlays)) / Math.log1p(maxPlays);
    const recency = (Date.parse(track.releaseAt) - oldest) / Math.max(1, newest - oldest);
    if (discovery === 'familiar') return familiarity * 0.82 + recency * 0.18;
    if (discovery === 'surprise') return (1 - familiarity) * 0.72 + recency * 0.28;
    return familiarity * 0.45 + recency * 0.55;
  };
  const ordered = [...filtered].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
  const chosen: CatalogTrack[] = [];
  const artistUsage = new Map<string, number>();
  const remaining = [...ordered];
  while (chosen.length < Math.min(count, ordered.length) && remaining.length) {
    const nextIndex = remaining.findIndex((track) => (artistUsage.get(track.artistId) ?? 0) === 0);
    const [item] = remaining.splice(nextIndex === -1 ? 0 : nextIndex, 1);
    if (!item) break;
    chosen.push(item);
    artistUsage.set(item.artistId, (artistUsage.get(item.artistId) ?? 0) + 1);
  }
  return chosen.map((track) => ({
    track,
    why: mood !== 'all' ? 'mood'
      : discovery === 'surprise' ? 'explore'
        : discovery === 'familiar' ? 'popular' : 'new',
  }));
}
