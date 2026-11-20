import type { SearchResults } from '@/lib/data/queries';

/** Keep the suggestion wire payload minimal even as catalog models evolve. */
export function projectSearchSuggestions(results: SearchResults) {
  return {
    tracks: results.tracks.slice(0, 5).map((track) => ({
      id: track.id,
      title: track.title,
      slug: track.slug,
      artistName: track.artist?.name ?? '',
    })),
    artists: results.artists.slice(0, 3).map((artist) => ({
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
    })),
  };
}
