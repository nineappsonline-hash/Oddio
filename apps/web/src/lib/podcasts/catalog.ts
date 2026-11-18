import 'server-only';
import { cache } from 'react';
import { demoMode } from '@/lib/env';
import { serviceClient } from '@/lib/data/supabase-store';

export interface PodcastCategory {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
}
export interface PodcastShow {
  id: string;
  slug: string;
  title: string;
  description: string;
  author: string;
  artistId: string | null;
  language: string;
  categoryId: string;
  coverUrl: string | null;
  explicit: boolean;
}
export interface PodcastEpisode {
  id: string;
  showId: string;
  slug: string;
  title: string;
  description: string;
  durationSeconds: number;
  publishedAt: string;
  episodeNumber: number | null;
  seasonNumber: number | null;
  explicit: boolean;
}
export interface PodcastCatalog {
  categories: PodcastCategory[];
  shows: PodcastShow[];
  episodes: PodcastEpisode[];
}

const seed: Array<[string,string,string,string,string]> = [
  ['technology','Technology','تكنولوجيا','Technology, innovation and digital life.','التكنولوجيا والابتكار والحياة الرقمية.'],
  ['business','Business','أعمال','Entrepreneurship, finance and work.','ريادة الأعمال والاقتصاد والعمل.'],
  ['education','Education','تعليم','Learning, skills and practical knowledge.','التعلم والمهارات والمعرفة العملية.'],
  ['science','Science','علوم','Science, discoveries and research.','العلوم والاكتشافات والأبحاث.'],
  ['culture','Culture','ثقافة','Arts, society and ideas.','الفنون والمجتمع والأفكار.'],
  ['comedy','Comedy','كوميديا','Humor and entertaining conversations.','الضحك والحوارات الكوميدية.'],
  ['stories','Stories','قصص وحكايات','Narratives and real-life stories.','القصص والحكايات والتجارب.'],
  ['health','Health & Wellness','صحة وحياة','Health and wellness conversations.','نقاشات الصحة والعافية.'],
  ['news','News & Society','أخبار ومجتمع','Current events and society.','الأخبار والأحداث والمجتمع.'],
  ['sports','Sports','رياضة','Sports, teams and athletes.','الرياضة والفرق واللاعبين.'],
  ['music','Music & Arts','موسيقى وفنون','Music, creativity and the arts.','الموسيقى والإبداع والفنون.'],
];
export const DEFAULT_PODCAST_CATEGORIES: PodcastCategory[] = seed.map(([slug,nameEn,nameAr,descriptionEn,descriptionAr]) => ({
  id: slug,
  slug,
  nameEn,
  nameAr,
  descriptionEn,
  descriptionAr,
}));

type Row = Record<string, unknown>;
const str = (v: unknown) => typeof v === 'string' ? v : '';
const maybeInt = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isPodcastId(value: string): boolean { return uuidPattern.test(value); }

/**
 * Public catalog only: service-role reads are filtered against published status
 * on both show and episode. No draft or scheduled audio leaks into HTML.
 * Before the migration is applied, the curated category directory still renders.
 */
export const getPodcastCatalog = cache(async (): Promise<PodcastCatalog> => {
  const fallback = { categories: DEFAULT_PODCAST_CATEGORIES, shows: [], episodes: [] };
  if (demoMode) return fallback;
  try {
    const client = serviceClient();
    const [categoryQuery, showQuery, episodeQuery] = await Promise.all([
      client.from('podcast_categories').select('id,slug,name_en,name_ar,description_en,description_ar').eq('active', true).order('sort_order'),
      client.from('podcast_shows').select('id,slug,title,description,author_name,artist_id,language_code,category_id,cover_url,explicit').eq('status', 'published').order('created_at', { ascending: false }).limit(200),
      client.from('podcast_episodes').select('id,show_id,slug,title,description,duration_seconds,published_at,episode_number,season_number,explicit')
        .eq('status', 'published').lte('published_at', new Date().toISOString()).order('published_at', { ascending: false }).limit(500),
    ]);
    if (categoryQuery.error || showQuery.error || episodeQuery.error) {
      // A fresh deployment may precede the database migration.
      console.warn('Oddio podcast catalog is not available yet; apply the podcast migration.');
      return fallback;
    }
    const categories = ((categoryQuery.data ?? []) as Row[]).map((r) => ({
      id: str(r.id), slug: str(r.slug), nameEn: str(r.name_en), nameAr: str(r.name_ar),
      descriptionEn: str(r.description_en), descriptionAr: str(r.description_ar),
    }));
    const shows = ((showQuery.data ?? []) as Row[]).map((r) => ({
      id: str(r.id), slug: str(r.slug), title: str(r.title), description: str(r.description),
      author: str(r.author_name), artistId: str(r.artist_id) || null, language: str(r.language_code), categoryId: str(r.category_id),
      coverUrl: str(r.cover_url) || null, explicit: r.explicit === true,
    }));
    const visible = new Set(shows.map((show) => show.id));
    const episodes = ((episodeQuery.data ?? []) as Row[])
      .filter((r) => visible.has(str(r.show_id)))
      .map((r) => ({
        id: str(r.id), showId: str(r.show_id), slug: str(r.slug), title: str(r.title),
        description: str(r.description), durationSeconds: maybeInt(r.duration_seconds) ?? 0,
        publishedAt: str(r.published_at), episodeNumber: maybeInt(r.episode_number),
        seasonNumber: maybeInt(r.season_number), explicit: r.explicit === true,
      }));
    return { categories: categories.length ? categories : DEFAULT_PODCAST_CATEGORIES, shows, episodes };
  } catch (error) {
    console.error('Podcast catalog could not be loaded', error);
    return fallback;
  }
});

export function podcastCategoryLabel(category: PodcastCategory, locale: 'ar' | 'en') {
  return locale === 'ar' ? category.nameAr : category.nameEn;
}

export function formatPodcastTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '—';
  const total = Math.floor(totalSeconds);
  const h = Math.floor(total / 3600), m = Math.floor(total % 3600 / 60), s = total % 60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
}
