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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {genres.map((genre, index) => (
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
      ) : (
        <p className="text-muted">
          {ar ? 'لا توجد أنواع موسيقية حاليًا.' : 'No genres available yet.'}
        </p>
      )}
    </div>
  );
}
