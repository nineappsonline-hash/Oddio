import Link from 'next/link';
import { ArrowUpRight, Compass, SlidersHorizontal } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { searchQuery } from '@ai-music/contracts';
import { getHomeData, searchCatalog } from '@/lib/data/queries';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getViewer } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { TrackCard } from '@/components/music/TrackCard';
import { GenreArtwork } from '@/components/music/GenreArtwork';
import { TrackRow } from '@/components/music/TrackRow';
import { EmptyState } from '@/components/ui/EmptyState';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : 'en';
  const t = createTranslator(safeLocale);
  return buildMetadata({
    locale: safeLocale,
    title: t('discover.title'),
    description: t('discover.subtitle'),
    path: '/discover',
  });
}

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DiscoverPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Params>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);
  const sp = await searchParams;
  const viewer = await getViewer();
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const home = getHomeData(db, viewer);

  const parsed = searchQuery.safeParse({
    q: first(sp.q) ?? '',
    genre: first(sp.genre) || undefined,
    mood: first(sp.mood) || undefined,
    language: first(sp.language) || undefined,
    country: first(sp.country) || undefined,
    sort: first(sp.sort) ?? 'relevant',
    limit: 25,
    cursor: first(sp.cursor),
  });
  const query = parsed.success ? parsed.data : searchQuery.parse({});
  const results = searchCatalog(db, viewer, query);
  const genreLabel = (item: { labelEn: string; labelAr: string }) =>
    locale === 'ar' ? item.labelAr : item.labelEn;
  const activeFilters = [
    query.q,
    query.genre,
    query.mood,
    query.language,
    query.country,
    query.sort !== 'relevant' ? query.sort : '',
  ].filter(Boolean);

  return (
    <div className="oddio-explore-page">
      <header className="oddio-explore-heading">
        <div>
          <p className="oddio-micro-label">
            <Compass size={14} /> {locale === 'ar' ? 'خريطة الموسيقى' : 'THE SOUND ATLAS'}
          </p>
          <h1>{t('discover.title')}</h1>
          <p>{t('discover.subtitle')}</p>
        </div>
        <Link href={`/${locale}/soundspace`} className="oddio-explore-mood-link">
          {locale === 'ar' ? 'موسيقى على مزاجك' : 'Explore your mood'}{' '}
          <ArrowUpRight size={16} />
        </Link>
      </header>
      <section
        className="oddio-explore-shortcuts"
        aria-label={locale === 'ar' ? 'أنواع موسيقى' : 'Browse genres'}
      >
        {home.genres.slice(0, 6).map((genre, index) => (
          <Link
            key={genre.id}
            href={`/${locale}/genres/${genre.slug}`}
            className={`oddio-explore-shortcut oddio-explore-shortcut-${index % 6}`}
          >
            <GenreArtwork slug={genre.slug} index={index} />
            <span className="relative z-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              {genreLabel(genre)}
            </span>
            <ArrowUpRight
              className="relative z-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
              size={17}
              aria-hidden="true"
            />
          </Link>
        ))}
      </section>
      <div className="oddio-explore-filter-label">
        <SlidersHorizontal size={16} />
        <span>
          {locale === 'ar' ? 'فلتر الموسيقى حسب اختيارك' : 'REFINE YOUR DISCOVERY'}
        </span>
      </div>

      <form
        method="get"
        className="oddio-explore-filter-card mb-8 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5"
        action={`/${locale}/discover`}
      >
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted sm:col-span-2 lg:col-span-5">
          {t('common.search')}
          <input
            type="search"
            name="q"
            defaultValue={query.q}
            maxLength={120}
            className="input mt-1.5 h-11"
            placeholder={t('search.placeholder')}
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
          {t('discover.genre')}
          <select
            name="genre"
            defaultValue={query.genre ?? ''}
            className="input mt-1.5 h-10"
          >
            <option value="">{t('common.all')}</option>
            {home.genres.map((genre) => (
              <option key={genre.id} value={genre.slug}>
                {genreLabel(genre)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
          {t('discover.mood')}
          <select
            name="mood"
            defaultValue={query.mood ?? ''}
            className="input mt-1.5 h-10"
          >
            <option value="">{t('common.all')}</option>
            {home.moods.map((mood) => (
              <option key={mood.id} value={mood.slug}>
                {genreLabel(mood)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
          {t('discover.language')}
          <select
            name="language"
            defaultValue={query.language ?? ''}
            className="input mt-1.5 h-10"
          >
            <option value="">{t('common.all')}</option>
            <option value="ar">العربية</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
          {t('discover.sort')}
          <select name="sort" defaultValue={query.sort} className="input mt-1.5 h-10">
            <option value="relevant">{t('discover.sort.relevant')}</option>
            <option value="newest">{t('discover.sort.newest')}</option>
            <option value="popular">{t('discover.sort.popular')}</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="h-10 flex-1 rounded-lg bg-primary px-4 text-sm font-semibold text-[#211518] transition hover:bg-primary-strong"
          >
            {t('common.search')}
          </button>
          {activeFilters.length > 0 ? (
            <Link
              href={`/${locale}/discover`}
              className="flex h-10 items-center rounded-lg border border-white/15 px-3 text-xs text-muted hover:text-ink"
            >
              {t('discover.reset')}
            </Link>
          ) : null}
        </div>
      </form>

      <div className="oddio-explore-results-label mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {t('discover.results', { count: String(results.total) })}
        </p>
      </div>

      {results.tracks.length === 0 ? (
        <EmptyState title={t('discover.empty')} />
      ) : (
        <>
          <div className="oddio-explore-results-grid mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {results.tracks.slice(0, 10).map((track) => (
              <TrackCard key={track.id} track={track} queue={results.tracks} />
            ))}
          </div>
          <div className="oddio-explore-track-list divide-y divide-white/5 p-2">
            {results.tracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                queue={results.tracks}
                index={index}
                locale={locale}
              />
            ))}
          </div>
          {results.nextCursor ? (
            <Link
              href={`/${locale}/discover?${new URLSearchParams({
                ...(query.q ? { q: query.q } : {}),
                ...(query.genre ? { genre: query.genre } : {}),
                ...(query.mood ? { mood: query.mood } : {}),
                ...(query.language ? { language: query.language } : {}),
                ...(query.country ? { country: query.country } : {}),
                sort: query.sort,
                cursor: results.nextCursor,
              }).toString()}`}
              className="inline-flex min-h-11 items-center rounded-full border border-primary/40 px-5 text-sm font-semibold text-primary hover:bg-primary/10"
            >
              {locale === 'ar' ? 'المزيد من الأغاني' : 'More tracks'}
            </Link>
          ) : null}
        </>
      )}

      {results.artists.length > 0 ? (
        <section id="artists" className="mt-10 scroll-mt-24">
          <h2 className="mb-3 text-lg font-bold text-ink">{t('common.artists')}</h2>
          <div className="flex flex-wrap gap-2">
            {results.artists.map((artist) => (
              <Link
                key={artist.id}
                href={`/${locale}/artists/${artist.slug}`}
                className="rounded-pill border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink hover:border-primary/40"
              >
                {artist.name}
                <span className="ms-2 text-xs text-muted">{artist.trackCount}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
