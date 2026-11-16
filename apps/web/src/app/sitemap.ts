import type { MetadataRoute } from 'next';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getSitemapEntries } from '@/lib/data/queries';
import { seoAbsoluteUrl as absoluteUrl } from '@/lib/seo-origin';
import { locales } from '@/i18n/config';
import { getPodcastCatalog } from '@/lib/podcasts/catalog';

export const dynamic = 'force-dynamic';

function languages(path: string) {
  return Object.fromEntries(
    locales.map((locale) => [locale, absoluteUrl(`/${locale}${path}`)]),
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const entries = getSitemapEntries(db);
  const podcasts = await getPodcastCatalog();
  const items: MetadataRoute.Sitemap = [];

  const staticPaths = [
    '',
    '/discover',
    '/podcasts',
    '/podcasts/categories',
    '/genres',
    '/about',
    '/install',
    '/soundspace',
    '/charts',
    '/for-artists',
    '/legal/terms',
    '/legal/privacy',
    '/legal/content-policy',
    '/legal/copyright',
  ];

  for (const locale of locales) {
    for (const path of staticPaths) {
      items.push({
        url: absoluteUrl(`/${locale}${path}`),
        changeFrequency: path === '' ? 'daily' : 'weekly',
        priority: path === '' ? 1 : 0.6,
        alternates: { languages: languages(path) },
      });
    }
    const activePodcastCategoryIds = new Set(podcasts.shows.map((show) => show.categoryId));
    for (const category of podcasts.categories.filter((item) => activePodcastCategoryIds.has(item.id))) {
      const path = `/podcasts/categories/${category.slug}`;
      items.push({ url: absoluteUrl(`/${locale}${path}`), changeFrequency: 'weekly', priority: 0.5,
        alternates: { languages: languages(path) } });
    }
    for (const show of podcasts.shows) {
      const path = `/podcasts/shows/${show.slug}`;
      items.push({ url: absoluteUrl(`/${locale}${path}`), changeFrequency: 'weekly', priority: 0.7,
        alternates: { languages: languages(path) } });
    }
    for (const episode of podcasts.episodes) {
      const path = `/podcasts/episodes/${episode.id}`;
      items.push({ url: absoluteUrl(`/${locale}${path}`), lastModified: episode.publishedAt ? new Date(episode.publishedAt) : undefined,
        changeFrequency: 'monthly', priority: 0.7, alternates: { languages: languages(path) } });
    }
    for (const genre of entries.genres) {
      const path = `/genres/${genre.slug}`;
      items.push({
        url: absoluteUrl(`/${locale}${path}`),
        changeFrequency: 'weekly',
        priority: 0.5,
        alternates: { languages: languages(path) },
      });
    }
    for (const mood of entries.moods) {
      const path = `/moods/${mood.slug}`;
      items.push({
        url: absoluteUrl(`/${locale}${path}`),
        changeFrequency: 'weekly',
        priority: 0.5,
        alternates: { languages: languages(path) },
      });
    }
    for (const artist of entries.artists) {
      const path = `/artists/${artist.slug}`;
      items.push({
        url: absoluteUrl(`/${locale}${path}`),
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: { languages: languages(path) },
      });
    }
    for (const track of entries.tracks) {
      const path = `/tracks/${track.id}-${track.slug}`;
      items.push({
        url: absoluteUrl(`/${locale}${path}`),
        lastModified: new Date(track.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: { languages: languages(path) },
      });
    }
    for (const album of entries.albums) {
      const path = `/albums/${album.id}`;
      items.push({
        url: absoluteUrl(`/${locale}${path}`),
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: { languages: languages(path) },
      });
    }
    for (const playlist of entries.playlists) {
      const path = `/playlists/${playlist.id}`;
      items.push({
        url: absoluteUrl(`/${locale}${path}`),
        changeFrequency: 'weekly',
        priority: 0.5,
        alternates: { languages: languages(path) },
      });
    }
  }

  return items;
}
