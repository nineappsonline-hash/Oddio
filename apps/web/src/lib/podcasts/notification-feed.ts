export interface FollowedPodcast {
  showId: string;
  followedAt: string;
}

export interface PublishedPodcastEpisode {
  id: string;
  showId: string;
  publishedAt: string;
}

export interface PodcastNotificationCandidate {
  episodeId: string;
  showId: string;
  publishedAt: string;
}

/**
 * Inbox entries are derived at read time; no cron or mail delivery.
 * Only episodes published after following are eligible, so following an
 * old series never dumps its back catalogue into the notification inbox.
 */
export function podcastNotificationCandidates(
  episodes: readonly PublishedPodcastEpisode[],
  follows: readonly FollowedPodcast[],
  now = Date.now(),
  maxAgeDays = 180,
): PodcastNotificationCandidate[] {
  const followTimes = new Map(
    follows
      .map((follow) => [follow.showId, Date.parse(follow.followedAt)] as const)
      .filter((entry) => Number.isFinite(entry[1])),
  );
  const cutoff = now - maxAgeDays * 86_400_000;
  return episodes
    .filter((episode) => {
      const publishedAt = Date.parse(episode.publishedAt);
      const followedAt = followTimes.get(episode.showId);
      return (
        followedAt !== undefined &&
        Number.isFinite(publishedAt) &&
        publishedAt > followedAt &&
        publishedAt <= now &&
        publishedAt >= cutoff
      );
    })
    .sort(
      (a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id),
    )
    .slice(0, 75)
    .map((episode) => ({
      episodeId: episode.id,
      showId: episode.showId,
      publishedAt: episode.publishedAt,
    }));
}
