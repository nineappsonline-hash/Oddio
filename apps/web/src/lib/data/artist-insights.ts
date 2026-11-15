import type { DemoDb } from './types';

/** Only owner-visible aggregated insights. No listener IDs or sessions leave the server. */
export function artistInsights(db: DemoDb, ownerUserId: string, now = new Date()) {
  const artistIds = new Set(db.artists.filter((artist) => artist.ownerUserId === ownerUserId).map((artist) => artist.id));
  const owned = db.tracks.filter((track) => artistIds.has(track.artistId));
  const ownedIds = new Set(owned.map((track) => track.id));
  const dayStart = (value: Date) => Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  const today = dayStart(now);
  const daily = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today - (29 - index) * 86400000);
    return { date: date.toISOString().slice(0, 10), qualifiedPlays: 0 };
  });
  const byDay = new Map(daily.map((row) => [row.date, row]));
  const recentByTrack = new Map<string, number>();
  for (const event of db.playbackEvents) {
    if (!event.qualified || !ownedIds.has(event.trackId)) continue;
    const occurred = Date.parse(event.occurredAt);
    if (!Number.isFinite(occurred) || occurred > now.getTime() || occurred < today - 29 * 86400000) continue;
    const key = new Date(occurred).toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.qualifiedPlays += 1;
    recentByTrack.set(event.trackId, (recentByTrack.get(event.trackId) ?? 0) + 1);
  }
  const sevenDays = daily.slice(-7).reduce((sum, row) => sum + row.qualifiedPlays, 0);
  const thirtyDays = daily.reduce((sum, row) => sum + row.qualifiedPlays, 0);
  const tracks = owned
    .map((track) => ({
      id: track.id,
      title: track.title,
      qualifiedPlays: track.qualifiedPlays,
      recentQualifiedPlays: recentByTrack.get(track.id) ?? 0,
      likeCount: track.likeCount,
      reviewStatus: track.reviewStatus,
      publishStatus: track.publishStatus,
    }))
    .sort((a, b) => b.recentQualifiedPlays - a.recentQualifiedPlays ||
      b.qualifiedPlays - a.qualifiedPlays || a.id.localeCompare(b.id));
  const followerCount = db.artistFollows.filter((follow) => artistIds.has(follow.artistId)).length;
  return {
    artists: artistIds.size,
    totalTracks: owned.length,
    released: owned.filter((track) => track.publishStatus === 'published').length,
    pendingReview: owned.filter((track) => ['ready_for_review', 'pending_review', 'processing'].includes(track.reviewStatus)).length,
    followers: followerCount,
    totalQualifiedPlays: owned.reduce((sum, track) => sum + (track.qualifiedPlays ?? 0), 0),
    sevenDays,
    thirtyDays,
    daily,
    tracks,
  };
}
