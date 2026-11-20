import 'server-only';
import { demoMode } from '@/lib/env';
import { serviceClient } from '@/lib/data/supabase-store';
import { getPodcastCatalog } from '@/lib/podcasts/catalog';
import { filterPodcastCatalog, getContentLanguagePreference } from '@/lib/content-language';
import { podcastNotificationCandidates } from './notification-feed';

export interface PodcastNotificationItem {
  episodeId: string;
  episodeTitle: string;
  showId: string;
  showTitle: string;
  showSlug: string;
  coverUrl: string | null;
  publishedAt: string;
  read: boolean;
}

export interface PodcastInbox {
  enabled: boolean;
  unreadCount: number;
  entries: PodcastNotificationItem[];
  demo: boolean;
}

export async function podcastInbox(userId: string): Promise<PodcastInbox> {
  if (demoMode) return { enabled: true, unreadCount: 0, entries: [], demo: true };
  const db = serviceClient();
  const [follows, preference, catalog] = await Promise.all([
    db.from('podcast_show_follows')
      .select('show_id,followed_at')
      .eq('user_id', userId)
      .order('followed_at', { ascending: false })
      .limit(500),
    db.from('podcast_notification_preferences')
      .select('in_app_enabled')
      .eq('user_id', userId)
      .maybeSingle(),
    (async () => filterPodcastCatalog(
      await getPodcastCatalog(),
      await getContentLanguagePreference(),
    ))(),
  ]);
  if (follows.error) throw follows.error;
  if (preference.error) throw preference.error;
  const enabled = preference.data?.in_app_enabled !== false;
  const candidates = podcastNotificationCandidates(
    catalog.episodes,
    (follows.data ?? []).map((row) => ({
      showId: row.show_id as string,
      followedAt: row.followed_at as string,
    })),
  );
  if (!candidates.length || !enabled) {
    return { enabled, unreadCount: 0, entries: [], demo: false };
  }
  const showMap = new Map(catalog.shows.map((show) => [show.id, show]));
  const episodeMap = new Map(catalog.episodes.map((episode) => [episode.id, episode]));
  const { data: reads, error } = await db.from('podcast_notification_reads')
    .select('episode_id')
    .eq('user_id', userId)
    .in('episode_id', candidates.map((entry) => entry.episodeId));
  if (error) throw error;
  const readIds = new Set((reads ?? []).map((row) => row.episode_id as string));
  const entries = candidates.flatMap((candidate) => {
    const show = showMap.get(candidate.showId);
    const episode = episodeMap.get(candidate.episodeId);
    if (!show || !episode) return [];
    return [{
      episodeId: episode.id,
      episodeTitle: episode.title,
      showId: show.id,
      showTitle: show.title,
      showSlug: show.slug,
      coverUrl: show.coverUrl,
      publishedAt: candidate.publishedAt,
      read: readIds.has(episode.id),
    }];
  });
  return {
    enabled,
    unreadCount: entries.filter((entry) => !entry.read).length,
    entries,
    demo: false,
  };
}
