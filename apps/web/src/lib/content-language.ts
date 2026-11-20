import 'server-only';
import { cookies } from 'next/headers';
import type { Track } from '@ai-music/contracts';
import type { DemoDb } from '@/lib/data/types';
import type { PodcastCatalog } from '@/lib/podcasts/catalog';

export type ContentLanguagePreference = 'ar' | 'all';
export const CONTENT_LANGUAGE_COOKIE = 'oddio_content_language';

/**
 * Content language is independent of the UI locale. Unknown audio language
 * codes aren't Arabic: do not silently label them as such.
 */
export async function getContentLanguagePreference(): Promise<ContentLanguagePreference> {
  const store = await cookies();
  return store.get(CONTENT_LANGUAGE_COOKIE)?.value === 'ar' ? 'ar' : 'all';
}

export function isArabicLanguage(language: string | null | undefined): boolean {
  return /^ar(?:[-_]|$)/i.test((language ?? '').trim());
}

export function matchesContentLanguage(
  language: string | null | undefined,
  preference: ContentLanguagePreference,
): boolean {
  return preference === 'all' || isArabicLanguage(language);
}

/** Keep all other DB tables intact; only the browsing track catalog changes. */
export function filterMusicDb(db: DemoDb, preference: ContentLanguagePreference): DemoDb {
  if (preference === 'all') return db;
  return {
    ...db,
    tracks: db.tracks.filter((track: Track) => isArabicLanguage(track.languageCode)),
  };
}

/**
 * Podcast episodes inherit the language of their own show; don't filter by
 * the page UI language or by the text of a title.
 */
export function filterPodcastCatalog(
  catalog: PodcastCatalog,
  preference: ContentLanguagePreference,
): PodcastCatalog {
  if (preference === 'all') return catalog;
  const shows = catalog.shows.filter((show) => isArabicLanguage(show.language));
  const allowed = new Set(shows.map((show) => show.id));
  return {
    ...catalog,
    shows,
    episodes: catalog.episodes.filter((episode) => allowed.has(episode.showId)),
  };
}
