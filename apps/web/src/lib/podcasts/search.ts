import { normalizeMusicSearch } from '../music-search';
import type { PodcastCatalog } from './catalog';
import { podcastEditorialNote } from './editorial-notes';

export function podcastSearchQuery(raw?: string | string[]) {
  return (typeof raw === 'string' ? raw : (raw?.[0] ?? '')).trim().slice(0, 100);
}

export function searchPodcastCatalog(catalog: PodcastCatalog, query: string) {
  const term = normalizeMusicSearch(query);
  if (!term) return { shows: catalog.shows, episodes: catalog.episodes };

  const matches = (text: string) => normalizeMusicSearch(text).includes(term);
  const shows = catalog.shows.filter((show) =>
    [show.title, show.description, show.author].some(matches),
  );
  const matchedShowIds = new Set(shows.map((show) => show.id));
  const byShow = new Map(catalog.shows.map((show) => [show.id, show]));
  const direct: PodcastCatalog['episodes'] = [];
  const inherited: PodcastCatalog['episodes'] = [];
  for (const episode of catalog.episodes) {
    const show = byShow.get(episode.showId);
    if (!show) continue;
    const editorialMatches =
      !episode.description.trim() &&
      (matches(podcastEditorialNote(episode, show.slug, 'ar')) ||
        matches(podcastEditorialNote(episode, show.slug, 'en')));
    if (matches(episode.title) || matches(episode.description) || editorialMatches) {
      direct.push(episode);
    } else if (matchedShowIds.has(episode.showId)) {
      inherited.push(episode);
    }
  }
  return { shows, episodes: [...direct, ...inherited] };
}
