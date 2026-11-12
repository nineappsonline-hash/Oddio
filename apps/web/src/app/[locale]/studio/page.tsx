import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BarChart3, Heart, Mic2, Users } from 'lucide-react';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { getStudioData } from '@/lib/data/queries';
import { env } from '@/lib/env';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { Stat } from '@/components/ui/Stat';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { StudioTrackActions } from '@/components/studio/StudioTrackActions';
import { formatDate, formatNumber } from '@/lib/utils';

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
    title: t('studio.title'),
    description: t('studio.subtitle'),
    path: '/studio',
    noindex: true,
  });
}

export default async function StudioDashboard({
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

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={t('studio.totalPlays')}
          value={formatNumber(data.analytics.qualifiedPlays, locale)}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <Stat
          label={t('studio.totalLikes')}
          value={formatNumber(data.analytics.likes, locale)}
          icon={<Heart className="h-4 w-4" />}
        />
        <Stat
          label={t('studio.totalFollowers')}
          value={formatNumber(data.analytics.followers, locale)}
          icon={<Users className="h-4 w-4" />}
        />
        <Stat
          label={t('studio.recentReleases')}
          value={formatNumber(data.analytics.releases, locale)}
          icon={<Mic2 className="h-4 w-4" />}
        />
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('studio.quota')}
          </p>
          <p className="mt-1 text-sm text-ink">
            {t('studio.quotaRemaining', {
              remaining: String(data.quota.remaining),
              limit: String(data.quota.dailyLimit),
            })}
          </p>
        </div>
        <div className="h-2 w-48 overflow-hidden rounded-pill bg-white/10">
          <div
            className="h-full rounded-pill bg-primary"
            style={{
              width: `${Math.min(100, (data.quota.usedToday / Math.max(1, data.quota.dailyLimit)) * 100)}%`,
            }}
          />
        </div>
        <Link
          href={`/${locale}/studio/tracks/new`}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {t('studio.uploadTrack')}
        </Link>
      </div>

      {data.artists.length === 0 ? (
        <EmptyState
          title={t('studio.noArtists')}
          action={
            <Link
              href={`/${locale}/studio/artists/new`}
              className="rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              {t('studio.newArtist')}
            </Link>
          }
        />
      ) : null}

      <section>
        <SectionHeader
          title={t('studio.trackList')}
          action={
            <Link
              href={`/${locale}/studio/tracks`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t('common.viewAll')}
            </Link>
          }
        />
        {data.tracks.length === 0 ? (
          <EmptyState title={t('studio.noTracks')} />
        ) : (
          <div className="card divide-y divide-white/5">
            {data.tracks.slice(0, 6).map((track) => (
              <div key={track.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{track.title}</p>
                  <p className="text-xs text-muted">
                    {track.artist?.name} · {formatDate(track.updatedAt, locale)}
                  </p>
                </div>
                <Badge
                  tone={
                    track.reviewStatus === 'approved'
                      ? 'success'
                      : track.reviewStatus === 'rejected'
                        ? 'danger'
                        : track.reviewStatus === 'changes_requested'
                          ? 'warning'
                          : 'neutral'
                  }
                >
                  {t(`studio.status.${track.reviewStatus}`)}
                </Badge>
                <span className="text-xs tabular-nums text-muted">
                  {formatNumber(track.qualifiedPlays, locale)}
                </span>
                <StudioTrackActions
                  trackId={track.id}
                  canSubmit={['draft', 'changes_requested', 'ready_for_review'].includes(
                    track.reviewStatus,
                  )}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
