import { notFound } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getGenrePage } from '@/lib/data/queries';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import Link from 'next/link';
import { GenreArtwork } from '@/components/music/GenreArtwork';
import { getViewer } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { PageHeader } from '@/components/ui/PageHeader';
import { TrackCard } from '@/components/music/TrackCard';
import { TrackRow } from '@/components/music/TrackRow';
import { EmptyState } from '@/components/ui/EmptyState';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const safeLocale: Locale = isLocale(raw) ? raw : 'en';
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const page = getGenrePage(db, { userId: null, roles: [] }, slug);
  const label = page
    ? safeLocale === 'ar'
      ? page.genre.labelAr
      : page.genre.labelEn
    : slug;
  return buildMetadata({
    locale: safeLocale,
    title: label,
    description: `${label} — ${createTranslator(safeLocale)('app.shortTagline')}`,
    path: `/genres/${slug}`,
  });
}

export default async function GenrePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);
  const viewer = await getViewer();
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const page = getGenrePage(db, viewer, slug);
  if (!page) notFound();
  const label = locale === 'ar' ? page.genre.labelAr : page.genre.labelEn;

  return (
    <div>
      <Link href={`/${locale}/genres`} className="mb-5 inline-block text-sm font-semibold text-primary hover:underline">← {locale === 'ar' ? 'كل الأنواع الموسيقية' : 'All genres'}</Link>
      <div className="relative mb-6 h-40 overflow-hidden rounded-2xl border border-white/10 sm:h-52"><GenreArtwork slug={page.genre.slug} /><div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" /></div>
      <PageHeader
        eyebrow={t('discover.genre')}
        title={label}
        subtitle={t('discover.results', { count: String(page.tracks.length) })}
      />
      {page.tracks.length === 0 ? (
        <EmptyState title={t('discover.empty')} />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {page.tracks.slice(0, 10).map((track) => (
              <TrackCard key={track.id} track={track} queue={page.tracks} />
            ))}
          </div>
          <div className="card divide-y divide-white/5 p-2">
            {page.tracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                queue={page.tracks}
                index={index}
                locale={locale}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
