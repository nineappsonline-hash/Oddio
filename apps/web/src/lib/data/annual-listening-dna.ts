import type { RecapListen } from './monthly-recap';

export interface ListeningDNA {
  year: number;
  qualifiedListens: number;
  tracks: number;
  artists: number;
  genres: Array<{ id: string; name: string; plays: number }>;
  topTracks: Array<{ id: string; title: string; artist: string; plays: number }>;
  topArtists: Array<{ id: string; name: string; plays: number }>;
  activeMonths: number;
  monthlyQualifiedListens: Array<{ month: number; plays: number }>;
}

/** Deterministic, opt-in private Rewind. Never guesses genre or listening minutes. */
export function annualListeningDNA(
  listens: RecapListen[],
  year: number,
  locale: 'ar' | 'en' = 'en',
): ListeningDNA {
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const songCounts = new Map<string, { title: string; artist: string; plays: number }>();
  const artistCounts = new Map<string, { name: string; plays: number }>();
  const genreCounts = new Map<string, { name: string; plays: number }>();
  const months = new Set<number>();
  const monthlyCounts = Array.from({ length: 12 }, () => 0);
  let qualifiedListens = 0;
  for (const listen of listens) {
    const at = Date.parse(listen.playedAt);
    if (!Number.isFinite(at) || at < start || at >= end) continue;
    qualifiedListens++;
    const month = new Date(at).getUTCMonth();
    months.add(month);
    monthlyCounts[month] += 1;
    const previous = songCounts.get(listen.id);
    songCounts.set(listen.id, {
      title: listen.title,
      artist: listen.artist?.name ?? 'Oddio Artist',
      plays: (previous?.plays ?? 0) + 1,
    });
    const artist = artistCounts.get(listen.artistId);
    artistCounts.set(listen.artistId, {
      name: listen.artist?.name ?? 'Oddio Artist',
      plays: (artist?.plays ?? 0) + 1,
    });
    // A track with multiple genres is assigned to its primary catalog genre,
    // avoiding artificially multiplying listening totals.
    if (listen.genre?.id) {
      const genre = genreCounts.get(listen.genre.id);
      genreCounts.set(listen.genre.id, {
        name:
          (locale === 'ar' ? listen.genre.labelAr : listen.genre.labelEn) || 'Unknown',
        plays: (genre?.plays ?? 0) + 1,
      });
    }
  }
  const sorted = <T extends { plays: number }>(entries: Array<[string, T]>) =>
    entries
      .sort(([aId, a], [bId, b]) => b.plays - a.plays || aId.localeCompare(bId))
      .slice(0, 5)
      .map(([id, value]) => ({ id, ...value }));
  return {
    year,
    qualifiedListens,
    tracks: songCounts.size,
    artists: artistCounts.size,
    activeMonths: months.size,
    monthlyQualifiedListens: monthlyCounts.map((plays, month) => ({ month: month + 1, plays })),
    genres: sorted([...genreCounts.entries()]),
    topTracks: sorted([...songCounts.entries()]),
    topArtists: sorted([...artistCounts.entries()]),
  };
}
