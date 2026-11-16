import type { CatalogTrack } from '@/lib/data/queries';
import type { PodcastEpisode, PodcastShow } from '@/lib/podcasts/catalog';

export function isPodcastPlayback(track: CatalogTrack | null | undefined): boolean {
  return !!track && track.slug === 'oddio-podcast-episode';
}

export function podcastAsTrack(episode: PodcastEpisode, show: PodcastShow): CatalogTrack {
  // Player UI uses the same metadata shape for both formats. Audio remains
  // authorized by the dedicated published-podcast route, not music APIs.
  return {
    id: episode.id,
    slug: 'oddio-podcast-episode',
    title: episode.title,
    durationMs: episode.durationSeconds * 1000,
    artwork: { url: show.coverUrl, accent: '#9e6ac9' },
    artist: { id: show.artistId ?? show.id, name: show.title, slug: show.slug },
    genre: null,
    qualityLabel: 'Podcast',
    productionType: 'fully_ai',
    likeCount: 0,
    qualifiedPlays: 0,
    isLiked: false,
  } as unknown as CatalogTrack;
}
