import type { CatalogTrack } from './queries';

export interface DiscoveryQualityMetrics {
  candidateCount: number;
  shownCount: number;
  uniqueArtists: number;
  artistCoverage: number;
  topArtistShare: number;
  excludedTrackLeaks: number;
  excludedGenreLeaks: number;
}

/** Aggregated non-identifying measurements for a single recommendation batch.
 * This function does not log accounts, history, track titles, or personal data.
 * It does not send any telemetry; it is usable in CI or opt-in analysis.
 */
export function evaluateDiscoveryQuality(
  available: CatalogTrack[],
  selected: CatalogTrack[],
  blockedTrackIds: ReadonlySet<string> = new Set(),
  blockedGenreIds: ReadonlySet<string> = new Set(),
): DiscoveryQualityMetrics {
  const artists = new Map<string, number>();
  let excludedTrackLeaks = 0;
  let excludedGenreLeaks = 0;
  for (const track of selected) {
    artists.set(track.artistId, (artists.get(track.artistId) ?? 0) + 1);
    if (blockedTrackIds.has(track.id)) excludedTrackLeaks += 1;
    if (
      (track.genreIds?.length ? track.genreIds : [track.genreId]).some((id) =>
        blockedGenreIds.has(id),
      )
    )
      excludedGenreLeaks += 1;
  }
  const eligibleArtists = new Set(available.map((track) => track.artistId));
  const uniqueArtists = artists.size;
  return {
    candidateCount: available.length,
    shownCount: selected.length,
    uniqueArtists,
    artistCoverage: eligibleArtists.size ? uniqueArtists / eligibleArtists.size : 0,
    topArtistShare: selected.length ? Math.max(...artists.values()) / selected.length : 0,
    excludedTrackLeaks,
    excludedGenreLeaks,
  };
}
