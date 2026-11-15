import Link from 'next/link';
import { ArrowUpRight, Compass } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { GenreArtwork } from '@/components/music/GenreArtwork';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const GENRE_GROUPS = [
  {
    key: 'arabic',
    en: 'Arabic Music',
    ar: 'موسيقى عربية',
    keywords: ['arabic', 'shaabi', 'mahragan', 'tarab', 'khaleeji', 'khaliji', 'rai', 'dabke', 'baladi', 'oriental', 'egyptian', 'arab', 'nasheed'],
  },
  {
    key: 'pop',
    en: 'Pop & Contemporary',
    ar: 'بوب وموسيقى معاصرة',
    keywords: ['pop', 'indie', 'r&b', 'rnb', 'soul', 'funk', 'disco', 'contemporary', 'afrobeat', 'reggaeton'],
  },
  {
    key: 'hiphop',
    en: 'Hip-Hop & Urban',
    ar: 'هيب هوب وموسيقى حضرية',
    keywords: ['hip-hop', 'hip hop', 'hiphop', 'rap', 'trap', 'drill', 'urban', 'grime'],
  },
  {
    key: 'electronic',
    en: 'Electronic & Dance',
    ar: 'إلكترونية ورقص',
    keywords: ['electronic', 'edm', 'house', 'techno', 'trance', 'dubstep', 'dance', 'dnb', 'drum and bass', 'garage', 'synthwave'],
  },
  {
    key: 'rock',
    en: 'Rock & Alternative',
    ar: 'روك وبديلة',
    keywords: ['rock', 'alternative', 'metal', 'punk', 'grunge', 'emo', 'hardcore'],
  },
  {
    key: 'chill',
    en: 'Chill & Instrumental',
    ar: 'هادية وموسيقى آلية',
    keywords: ['chill', 'ambient', 'lo-fi', 'lofi', 'acoustic', 'classical', 'cinematic', 'instrumental', 'jazz', 'blues', 'folk', 'piano', 'meditation', 'sleep'],
  },
] as const;

function genreGroupKey(genre: { slug: string; labelEn: string }): string {
  const value = `${genre.slug.replace(/[-_]/g, ' ')} ${genre.labelEn}`.toLowerCase();
  return GENRE_GROUPS.find(({ keywords }) =>
    keywords.some((keyword) => value.includes(keyword)),
  )?.key ?? 'other';
}


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : 'en';
  return buildMetadata({
    locale: safeLocale,
    title: safeLocale === 'ar' ? 'كل أنواع الموسيقى' : 'All Genres',
    description:
      safeLocale === 'ar'
        ? 'استكشف جميع أنواع الموسيقى على أوديو.'
        : 'Explore every music genre on Oddio.',
    path: '/genres',
  });
}

export default async function GenresPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ar = locale === 'ar';
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const genres = db.genres
    .filter((genre) => genre.active)
    .sort((a, b) =>
      (ar ? a.labelAr : a.labelEn).localeCompare(ar ? b.labelAr : b.labelEn),
    );
  const groups = GENRE_GROUPS.map((group) => ({
    ...group,
    items: genres.filter((genre) => genreGroupKey(genre) === group.key),
  })).filter((group) => group.items.length > 0);
  const otherGenres = genres.filter((genre) => genreGroupKey(genre) === 'other');
  if (otherGenres.length) {
    groups.push({
      key: 'other',
      en: 'More genres',
      ar: 'أنواع موسيقية أخرى',
      keywords: [],
      items: otherGenres,
    });
  }
  return (
    <div className="space-y-8 pb-12">
      <header className="space-y-3">
        <p className="oddio-micro-label">
          <Compass size={15} /> {ar ? 'عالم أوديو الموسيقي' : 'THE SOUND ATLAS'}
        </p>
        <h1 className="text-3xl font-black tracking-tight text-ink sm:text-5xl">
          {ar ? 'كل أنواع الموسيقى' : 'Explore all genres'}
        </h1>
        <p className="text-sm text-muted sm:text-base">
          {ar
            ? 'اختار النوع اللي بتحبه واكتشف الأغاني الخاصة بيه.'
            : 'Find your sound. Pick a genre to discover its tracks.'}
        </p>
        <p className="text-xs font-semibold text-muted">
          {genres.length} {ar ? 'نوع موسيقي' : 'genres'}
        </p>
      </header>

      {genres.length ? (
        <div className="space-y-10">
          <nav aria-label={ar ? 'مجموعات الأنواع الموسيقية' : 'Genre collections'} className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <a
                key={group.key}
                href={`#genre-group-${group.key}`}
                className="inline-flex min-h-11 items-center rounded-full border border-white/15 bg-[#30263a] px-4 text-sm font-semibold text-ink transition hover:border-primary/70 hover:bg-[#44304f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                {ar ? group.ar : group.en}
              </a>
            ))}
          </nav>
          {groups.map((group) => (
            <section
              key={group.key}
              id={`genre-group-${group.key}`}
              aria-labelledby={`genre-title-${group.key}`}
              className="scroll-mt-28 space-y-4"
            >
              <div className="flex items-center gap-3">
                <h2
                  id={`genre-title-${group.key}`}
                  className="text-xl font-extrabold text-ink sm:text-2xl"
                >
                  {ar ? group.ar : group.en}
                </h2>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs tabular-nums text-muted">
                  {group.items.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {group.items.map((genre, index) => (
                  <Link
                    key={genre.id}
                    href={`/${locale}/genres/${genre.slug}`}
                    className="group relative isolate aspect-[1.25] overflow-hidden rounded-2xl border border-white/10 bg-[#171420] transition duration-200 hover:-translate-y-1 hover:border-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <GenreArtwork slug={genre.slug} index={index} />
                    <span
                      className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"
                      aria-hidden="true"
                    />
                    <span className="absolute bottom-4 start-4 z-10 text-base font-extrabold text-white drop-shadow-md sm:text-lg">
                      {ar ? genre.labelAr : genre.labelEn}
                    </span>
                    <ArrowUpRight
                      size={18}
                      aria-hidden="true"
                      className="absolute end-4 top-4 z-10 text-white drop-shadow-md rtl:-scale-x-100"
                    />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="text-muted">
          {ar ? 'لا توجد أنواع موسيقية حاليًا.' : 'No genres available yet.'}
        </p>
      )}
    </div>
  );
}
