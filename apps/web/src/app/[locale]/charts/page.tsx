import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { chartQuery } from '@ai-music/contracts';
import { getCharts, getHomeData } from '@/lib/data/queries';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getViewer } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { PageHeader } from '@/components/ui/PageHeader';
import { TrackRow } from '@/components/music/TrackRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

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
    title: t('charts.title'),
    description: t('charts.subtitle'),
    path: '/charts',
  });
}

const PERIODS = ['daily', 'weekly', 'monthly'] as const;

export default async function ChartsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);
  const sp = await searchParams;
  const periodValue = typeof sp.period === 'string' ? sp.period : 'weekly';
  const parsed = chartQuery.safeParse({
    period: periodValue,
    genre: typeof sp.genre === 'string' && sp.genre ? sp.genre : undefined,
    country: typeof sp.country === 'string' && sp.country ? sp.country : undefined,
    limit: 50,
  });
  const query = parsed.success ? parsed.data : chartQuery.parse({});
  const viewer = await getViewer();
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const data = getCharts(db, viewer, query);
  const home = getHomeData(db, viewer);
  const queue = data.entries.map((entry) => entry.track);
  const genreLabel = (genre: { labelEn: string; labelAr: string }) =>
    locale === 'ar' ? genre.labelAr : genre.labelEn;
  const countries = Array.from(
    new Set(
      db.tracks
        .filter(
          (track) => track.publishStatus === 'published' && track.visibility === 'public',
        )
        .map((track) => track.countryCode)
        .filter(Boolean),
    ),
  ).sort();

  return (
    <div>
      <PageHeader title={t('charts.title')} subtitle={t('charts.subtitle')} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {PERIODS.map((period) => {
          const active = query.period === period;
          const qs = new URLSearchParams();
          qs.set('period', period);
          if (query.genre) qs.set('genre', query.genre);
          if (query.country) qs.set('country', query.country);
          return (
            <Link
              key={period}
              href={`/${locale}/charts?${qs.toString()}`}
              className={cn(
                'rounded-pill px-4 py-2 text-sm font-semibold transition',
                active
                  ? 'bg-primary text-white'
                  : 'border border-white/10 bg-white/5 text-muted hover:text-ink',
              )}
            >
              {t(`charts.period.${period}`)}
            </Link>
          );
        })}
      </div>

      <form
        method="get"
        action={`/${locale}/charts`}
        className="card mb-6 flex flex-wrap gap-3 p-4"
      >
        <input type="hidden" name="period" value={query.period} />
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('charts.genre')}
          <select
            name="genre"
            defaultValue={query.genre ?? ''}
            className="input ms-2 h-9"
          >
            <option value="">{t('charts.global')}</option>
            {home.genres.map((genre) => (
              <option key={genre.id} value={genre.slug}>
                {genreLabel(genre)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('charts.country')}
          <select
            name="country"
            defaultValue={query.country ?? ''}
            className="input ms-2 h-9"
          >
            <option value="">{t('charts.global')}</option>
            {countries.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-9 rounded-lg bg-white/10 px-4 text-sm font-semibold text-ink hover:bg-white/15"
        >
          {t('common.search')}
        </button>
      </form>

      {data.entries.length === 0 ? (
        <EmptyState title={t('charts.empty')} />
      ) : (
        <div className="card divide-y divide-white/5 p-2">
          {data.entries.map((entry) => (
            <TrackRow
              key={entry.track.id}
              track={entry.track}
              queue={queue}
              locale={locale}
              rank={entry.rank}
              showArtist
            />
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-muted">{t('charts.editorialNote')}</p>
    </div>
  );
}
