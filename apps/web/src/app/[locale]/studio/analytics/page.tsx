import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { getStudioData } from '@/lib/data/queries';
import { env } from '@/lib/env';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { Stat } from '@/components/ui/Stat';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatNumber } from '@/lib/utils';

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
    title: t('studio.analytics'),
    description: t('studio.analyticsTitle'),
    path: '/studio/analytics',
    noindex: true,
  });
}

export default async function StudioAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const t = createTranslator(locale);
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  if (!user.isArtistManager) redirect(`/${locale}/apply/artist`);
  const data = getStudioData(readDb(), user, { demoDailyLimit: env.uploadDailyLimit });
  const top = [...data.tracks]
    .sort((a, b) => b.qualifiedPlays - a.qualifiedPlays)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={t('studio.totalPlays')}
          value={formatNumber(data.analytics.qualifiedPlays, locale)}
        />
        <Stat
          label={t('studio.totalLikes')}
          value={formatNumber(data.analytics.likes, locale)}
        />
        <Stat
          label={t('studio.totalFollowers')}
          value={formatNumber(data.analytics.followers, locale)}
        />
        <Stat
          label={t('studio.recentReleases')}
          value={formatNumber(data.analytics.releases, locale)}
        />
      </div>
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
        {t('studio.analyticsTitle')}
      </h2>
      {top.length === 0 ? (
        <EmptyState title={t('studio.noTracks')} />
      ) : (
        <div className="card divide-y divide-white/5">
          {top.map((track) => (
            <div
              key={track.id}
              className="flex items-center justify-between gap-3 p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{track.title}</p>
                <p className="text-xs text-muted">{track.artist?.name}</p>
              </div>
              <span className="tabular-nums text-muted">
                {formatNumber(track.qualifiedPlays, locale)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
