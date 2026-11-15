import type { Viewer } from '@ai-music/db';
import type { DemoDb } from './types';
import { listableTracks, type CatalogTrack } from './queries';
import { recommendTracks } from './recommendations';

export type MixKind = 'flow' | 'daily' | 'weekly' | 'song' | 'artist' | 'genre' | 'mood';
export interface MixOptions {
  kind: MixKind;
  seedId?: string;
  excludeIds?: string[];
  blockedGenreIds?: string[];
  now?: Date;
  limit?: number;
}

function stableNumber(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Stable UTC rotations, with no cookies or external profiling. */
export function rotationKey(now: Date, kind: 'daily' | 'weekly'): string {
  const date = new Date(now);
  if (kind === 'daily') return date.toISOString().slice(0, 10);
  // Monday 00:00 UTC starts the new weekly mix.
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

export function buildDiscoveryMix(
  db: DemoDb,
  viewer: Viewer,
  options: MixOptions,
): { tracks: CatalogTrack[]; personalized: boolean } {
  const now = options.now ?? new Date();
  const limit = Math.max(0, Math.min(20, Math.floor(options.limit ?? 20)));
  const exclude = new Set((options.excludeIds ?? []).slice(0, 100));
  const blockedGenres = new Set((options.blockedGenreIds ?? []).slice(0, 50));
  const playable = listableTracks(db, viewer, now).filter(
    (track) => track.access.allowed && track.audio?.processingStatus === 'ready',
  );
  const catalog = playable.filter(
    (track) =>

      !exclude.has(track.id) &&
      !(track.genreIds?.length ? track.genreIds : [track.genreId]).some((id) =>
        blockedGenres.has(id),
      ),
  );
  const allowed = new Set(catalog.map((track) => track.id));
  const base = recommendTracks(db, viewer, 20);
  const ranked = base.tracks.filter((track) => allowed.has(track.id));
  const seed = playable.find((track) => track.id === options.seedId);
  // Never convert an invalid/deleted radio target into an unrelated mix.
  if ((options.kind === 'song' || options.kind === 'artist') && !seed)
    return { tracks: [], personalized: false };
  const category =
    options.kind === 'genre'
      ? db.genres.find((genre) => genre.id === options.seedId && genre.active)
      : options.kind === 'mood'
        ? db.moods.find((mood) => mood.id === options.seedId && mood.active)
        : null;
  if ((options.kind === 'genre' || options.kind === 'mood') && !category)
    return { tracks: [], personalized: false };
  const affinity = (track: CatalogTrack) => {
    if (!seed) return 0;
    const genres = new Set(seed.genreIds?.length ? seed.genreIds : [seed.genreId]);
    const sharedGenre = (track.genreIds?.length ? track.genreIds : [track.genreId]).some(
      (id) => genres.has(id),
    );
    const sharedMood = track.moodIds.some((id) => seed.moodIds.includes(id));
    return (
      Number(track.artistId === seed.artistId) * 5 +
      Number(sharedGenre) * 4 +
      Number(sharedMood) * 3
    );
  };
  const byId = new Map<string, CatalogTrack>();
  for (const track of [...ranked, ...catalog]) byId.set(track.id, track);
  let candidates = [...byId.values()];
  if (options.kind === 'genre' && category) {
    candidates = candidates.filter((track) =>
      (track.genreIds?.length ? track.genreIds : [track.genreId]).includes(category.id),
    );
  } else if (options.kind === 'mood' && category) {
    candidates = candidates.filter((track) => track.moodIds.includes(category.id));
  }
  if ((options.kind === 'song' || options.kind === 'artist') && seed) {
    candidates = candidates.sort(
      (a, b) =>
        affinity(b) - affinity(a) ||
        b.qualifiedPlays - a.qualifiedPlays ||
        a.id.localeCompare(b.id),
    );
  } else if (options.kind === 'daily' || options.kind === 'weekly') {
    const rotation = rotationKey(now, options.kind);
    const principal = viewer.userId ?? 'guest';
    const preferenceRank = new Map(ranked.map((track, index) => [track.id, index]));
    candidates = candidates.sort((a, b) => {
      const aScore =
        (preferenceRank.has(a.id) ? 10 : 0) +
        (stableNumber(principal + ':' + rotation + ':' + a.id) % 1000) / 1000;
      const bScore =
        (preferenceRank.has(b.id) ? 10 : 0) +
        (stableNumber(principal + ':' + rotation + ':' + b.id) % 1000) / 1000;
      return bScore - aScore || a.id.localeCompare(b.id);
    });
  }
  // Keep song-radio's seed first; otherwise use the ranking's strongest track.
  const first = options.kind === 'song' && seed && !exclude.has(seed.id) && candidates.some((item) => item.id === seed.id)
    ? seed
    : candidates[0];
  const selected: CatalogTrack[] = first ? [first] : [];
  const seenArtists = new Set(selected.map((track) => track.artistId));
  for (const track of candidates) {
    if (selected.length >= limit) break;
    if (selected.some((item) => item.id === track.id) || seenArtists.has(track.artistId))
      continue;
    selected.push(track);
    seenArtists.add(track.artistId);
  }
  for (const track of candidates) {
    if (selected.length >= limit) break;
    if (!selected.some((item) => item.id === track.id)) selected.push(track);
  }
  return {
    tracks: selected.slice(0, limit),
    personalized:
      base.personalized && options.kind !== 'song' && options.kind !== 'artist',
  };
}
