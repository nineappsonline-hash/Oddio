import type { PodcastEpisode, PodcastShow } from './catalog';

export interface PodcastRecommendation {
  show: PodcastShow;
  score: number;
  reason: 'similar' | 'recent' | 'discover';
}

export interface PodcastDiscovery {
  recommendations: PodcastRecommendation[];
  freshFromFollowing: PodcastEpisode[];
  continueExploring: PodcastEpisode[];
  personalized: boolean;
}

/**
 * Transparent, deterministic podcast discovery. Uses only a listener's own
 * follows and episode progress; no third-party AI profiles or user tracking.
 * The server must pass only catalog-visible shows and episodes.
 */
export function recommendPodcasts({
  shows,
  episodes,
  followedIds = [],
  listenedEpisodeIds = [],
  now = Date.now(),
}: {
  shows: readonly PodcastShow[];
  episodes: readonly PodcastEpisode[];
  followedIds?: readonly string[];
  listenedEpisodeIds?: readonly string[];
  now?: number;
}): PodcastDiscovery {
  const followed = new Set(followedIds);
  const listened = new Set(listenedEpisodeIds);
  const visible = new Set(shows.map((show) => show.id));
  const episodeById = new Map(episodes.map((episode) => [episode.id, episode]));
  const showsById = new Map(shows.map((show) => [show.id, show]));
  const categoryInterests = new Map<string, number>();

  for (const id of followed) {
    const show = showsById.get(id);
    if (show) categoryInterests.set(show.categoryId, (categoryInterests.get(show.categoryId) ?? 0) + 4);
  }
  for (const episodeId of listened) {
    const show = showsById.get(episodeById.get(episodeId)?.showId ?? '');
    if (show) categoryInterests.set(show.categoryId, (categoryInterests.get(show.categoryId) ?? 0) + 1);
  }

  const relevantEpisodes = episodes
    .filter((episode) => visible.has(episode.showId))
    .filter((episode) => Number.isFinite(Date.parse(episode.publishedAt)))
    .filter((episode) => Date.parse(episode.publishedAt) <= now)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id));
  const lastRelease = new Map<string, number>();
  for (const episode of relevantEpisodes) {
    if (!lastRelease.has(episode.showId)) lastRelease.set(episode.showId, Date.parse(episode.publishedAt));
  }
  const personalized = categoryInterests.size > 0;
  const recommendations = shows
    .filter((show) => !followed.has(show.id))
    .map((show) => {
      const categoryScore = categoryInterests.get(show.categoryId) ?? 0;
      const published = lastRelease.get(show.id) ?? 0;
      const daysOld = published ? Math.max(0, (now - published) / 86_400_000) : Infinity;
      const freshScore = daysOld <= 14 ? 4 : daysOld <= 60 ? 2 : daysOld <= 180 ? 1 : 0;
      return {
        show,
        score: Math.min(16, categoryScore) + freshScore,
        reason: categoryScore > 0 ? 'similar' as const : freshScore > 0 ? 'recent' as const : 'discover' as const,
      };
    })
    .sort((a, b) =>
      b.score - a.score ||
      (lastRelease.get(b.show.id) ?? 0) - (lastRelease.get(a.show.id) ?? 0) ||
      a.show.id.localeCompare(b.show.id),
    );

  // Spread exposure across genres rather than filling the shelf from one category.
  const diverse: PodcastRecommendation[] = [];
  const pending = [...recommendations];
  while (diverse.length < 12 && pending.length) {
    const inShelf = new Set(diverse.map((entry) => entry.show.categoryId));
    const nextIndex = pending.findIndex((entry) => !inShelf.has(entry.show.categoryId));
    const [next] = pending.splice(nextIndex >= 0 ? nextIndex : 0, 1);
    if (next) diverse.push(next);
  }

  return {
    recommendations: diverse,
    freshFromFollowing: relevantEpisodes
      .filter((episode) => followed.has(episode.showId) && !listened.has(episode.id))
      .slice(0, 12),
    continueExploring: relevantEpisodes
      .filter((episode) => !followed.has(episode.showId) && !listened.has(episode.id))
      .slice(0, 12),
    personalized,
  };
}
