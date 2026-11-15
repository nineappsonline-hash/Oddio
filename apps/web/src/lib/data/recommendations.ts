import type { Viewer } from '@ai-music/db';
import type { DemoDb } from './types';
import { listableTracks, type CatalogTrack } from './queries';

/** Transparent, zero-API-cost recommendations. No playback data is sent outside Oddio. */
export function recommendTracks(
  db: DemoDb,
  viewer: Viewer,
  limit = 6,
): {
  tracks: CatalogTrack[];
  personalized: boolean;
} {
  const available = listableTracks(db, viewer).filter(
    (track) => Boolean(track.audio) && track.audio?.processingStatus === 'ready',
  );
  const userId = viewer.userId;
  const likedIds = new Set(
    userId
      ? db.likes.filter((like) => like.userId === userId).map((like) => like.trackId)
      : [],
  );
  const sessionIds = new Set(
    userId
      ? db.playbackSessions
          .filter((session) => session.userId === userId)
          .map((session) => session.id)
      : [],
  );
  const listenedIds = new Set(
    db.playbackEvents
      .filter((event) => event.qualified && sessionIds.has(event.sessionId))
      .map((event) => event.trackId),
  );
  const seeds = available.filter(
    (track) => likedIds.has(track.id) || listenedIds.has(track.id),
  );
  const personalized = seeds.length > 0;
  const genreWeights = new Map<string, number>();
  const moodWeights = new Map<string, number>();
  const artistWeights = new Map<string, number>();
  for (const track of seeds) {
    const weight = likedIds.has(track.id) ? 3 : 1;
    for (const id of track.genreIds?.length ? track.genreIds : [track.genreId]) {
      genreWeights.set(id, (genreWeights.get(id) ?? 0) + weight);
    }
    for (const id of track.moodIds) {
      moodWeights.set(id, (moodWeights.get(id) ?? 0) + weight);
    }
    artistWeights.set(track.artistId, (artistWeights.get(track.artistId) ?? 0) + weight);
  }
  const ranked = available
    .filter((track) => !likedIds.has(track.id) && !listenedIds.has(track.id))
    .map((track) => {
      const genreScore = (
        track.genreIds?.length ? track.genreIds : [track.genreId]
      ).reduce((sum, id) => sum + (genreWeights.get(id) ?? 0), 0);
      const moodScore = track.moodIds.reduce(
        (sum, id) => sum + (moodWeights.get(id) ?? 0),
        0,
      );
      const popularity = Math.log1p(Math.max(0, track.qualifiedPlays)) * 0.12;
      const score = personalized
        ? genreScore * 3 +
          moodScore * 2 +
          (artistWeights.get(track.artistId) ?? 0) +
          popularity
        : popularity;
      return { track, score };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.track.releaseAt.localeCompare(a.track.releaseAt) ||
        a.track.id.localeCompare(b.track.id),
    );

  // Prefer different artists in the first pass; fill remaining slots by score.
  const selected: CatalogTrack[] = [];
  const seenArtists = new Set<string>();
  const target = Math.max(0, Math.min(20, Math.floor(limit)));
  for (const item of ranked) {
    if (selected.length >= target) break;
    if (seenArtists.has(item.track.artistId)) continue;
    selected.push(item.track);
    seenArtists.add(item.track.artistId);
  }
  for (const item of ranked) {
    if (selected.length >= target) break;
    if (!selected.some((track) => track.id === item.track.id)) selected.push(item.track);
  }
  return { tracks: selected, personalized };
}
