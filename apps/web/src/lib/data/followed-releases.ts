import type { Viewer } from '@ai-music/db';
import type { DemoDb } from './types';
import { listableTracks, type CatalogTrack } from './queries';

/**
 * Personal, newest-first releases by explicitly followed artists.
 * Always re-check current visibility and playable state on the server.
 * Never return another listener's followed artists or owner-only/unlisted tracks.
 */
export function getFollowedArtistReleases(
  db: DemoDb,
  viewer: Viewer,
  limit = 8,
): CatalogTrack[] {
  if (!viewer.userId) return [];
  const followed = new Set(
    db.artistFollows
      .filter((record) => record.userId === viewer.userId)
      .map((record) => record.artistId),
  );
  if (!followed.size) return [];
  return listableTracks(db, { userId: null, roles: [] })
    .filter((track) =>
      followed.has(track.artistId) &&
      Boolean(track.audio) &&
      track.audio?.processingStatus === 'ready',
    )
    .sort((a, b) => b.releaseAt.localeCompare(a.releaseAt) || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, Math.min(20, Math.floor(limit))));
}
