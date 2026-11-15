import type { Viewer } from '@ai-music/db';
import type { Artist } from '@ai-music/contracts';
import type { DemoDb } from './types';
import { listableTracks } from './queries';

export type DiscoveryArtist = Artist & { trackCount: number; followerCount: number };

function stableHash(text: string): number {
  let hash = 2166136261;
  for (const char of text) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return hash >>> 0;
}

/** Only publicly released artists. Editorial pins are honored, then independent artists rotate weekly. */
export function getDiscoveryArtists(
  db: DemoDb,
  viewer: Viewer,
  now = new Date(),
): { rising: DiscoveryArtist[]; spotlight: DiscoveryArtist | null } {
  const publicTracks = listableTracks(db, { userId: null, roles: [] }, now).filter(
    (track) => track.audio?.processingStatus === 'ready',
  );
  const counts = new Map<string, number>();
  const plays = new Map<string, number>();
  for (const track of publicTracks) {
    counts.set(track.artistId, (counts.get(track.artistId) ?? 0) + 1);
    plays.set(track.artistId, (plays.get(track.artistId) ?? 0) + track.qualifiedPlays);
  }
  const available: DiscoveryArtist[] = db.artists
    .filter((artist) => counts.has(artist.id))
    .map((artist) => ({
      ...artist,
      trackCount: counts.get(artist.id) ?? 0,
      followerCount: db.artistFollows.filter((item) => item.artistId === artist.id).length,
    }));
  const rotation = new Date(now);
  rotation.setUTCHours(0, 0, 0, 0);
  rotation.setUTCDate(rotation.getUTCDate() - ((rotation.getUTCDay() + 6) % 7));
  const key = rotation.toISOString().slice(0, 10);
  // Smaller artists should not compete on absolute qualified plays with major releases.
  const rising = [...available]
    .sort((a, b) =>
      (plays.get(a.id) ?? 0) / (counts.get(a.id) ?? 1) -
      (plays.get(b.id) ?? 0) / (counts.get(b.id) ?? 1) ||
      stableHash(a.id + key) - stableHash(b.id + key) ||
      a.id.localeCompare(b.id),
    )
    .slice(0, 4);
  const editorial = db.featuredSlots
    .filter((slot) => slot.entityType === 'artist' && slot.slot === 'spotlight')
    .filter((slot) =>
      (!slot.startAt || Date.parse(slot.startAt) <= now.getTime()) &&
      (!slot.endAt || Date.parse(slot.endAt) > now.getTime()),
    )
    .sort((a, b) => a.rank - b.rank)
    .find((slot) => available.some((artist) => artist.id === slot.entityId));
  const spotlight = editorial
    ? available.find((artist) => artist.id === editorial.entityId) ?? null
    : rising[0] ?? null;
  // viewer is intentionally not used for artist eligibility: no private or owner-only data.
  void viewer;
  return { rising, spotlight };
}
