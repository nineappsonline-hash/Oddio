import type { Viewer } from '@ai-music/db';
import type { DemoDb } from './types';
import { listableTracks } from './queries';

/** Artist similarity based only on public playable genre/mood metadata.
 * No invented artist biographies, embeddings or cross-user listening signals.
 */
export function getRelatedArtistsBySound(
  db: DemoDb,
  artistId: string,
  viewer: Viewer,
  limit = 4,
) {
  void viewer;
  const publicTracks = listableTracks(db, { userId: null, roles: [] })
    .filter((track) => track.access.allowed && track.audio?.processingStatus === 'ready');
  const current = publicTracks.filter((track) => track.artistId === artistId);
  if (!current.length) return [];
  const genres = new Set(current.flatMap((track) =>
    track.genreIds?.length ? track.genreIds : [track.genreId],
  ));
  const moods = new Set(current.flatMap((track) => track.moodIds));
  const candidateScores = new Map<string, number>();
  for (const track of publicTracks) {
    if (track.artistId === artistId) continue;
    const overlapGenres = (track.genreIds?.length ? track.genreIds : [track.genreId])
      .filter((genre) => genres.has(genre)).length;
    const overlapMoods = track.moodIds.filter((mood) => moods.has(mood)).length;
    const score = overlapGenres * 3 + overlapMoods;
    if (score > 0) candidateScores.set(
      track.artistId,
      (candidateScores.get(track.artistId) ?? 0) + score,
    );
  }
  const max = Math.max(0, Math.min(12, Math.floor(limit)));
  return db.artists
    .filter((artist) => candidateScores.has(artist.id))
    .sort((a, b) =>
      (candidateScores.get(b.id) ?? 0) - (candidateScores.get(a.id) ?? 0) ||
      a.name.localeCompare(b.name),
    )
    .slice(0, max);
}
