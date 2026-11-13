import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { TrackChangeUploader } from '@/components/studio/TrackChangeUploader';
import { getStudioData } from '@/lib/data/queries';
import { env } from '@/lib/env';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
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
    title: t('studio.trackList'),
    description: t('studio.subtitle'),
    path: '/studio/tracks',
    noindex: true,
  });
}

export default async function StudioTracksPage({
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
  const data = getStudioData(demoMode ? readDb() : await loadDbFromSupabase(), user, { demoDailyLimit: env.uploadDailyLimit });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {t('studio.quotaRemaining', {
            remaining: String(data.quota.remaining),
            limit: String(data.quota.dailyLimit),
          })}
        </p>
        <ButtonLink href={`/${locale}/studio/tracks/new`} size="sm">
          {t('studio.uploadTrack')}
        </ButtonLink>
      </div>
      {data.tracks.length === 0 ? (
        <EmptyState
          title={t('studio.noTracks')}
          action={
            <ButtonLink href={`/${locale}/studio/tracks/new`} size="sm">
              {t('studio.uploadTrack')}
            </ButtonLink>
          }
        />
      ) : (
        <div className="card divide-y divide-white/5">
          {data.tracks.map((track) => (
            <div key={track.id} className="flex flex-wrap items-center gap-3 p-3">
              <Link href={`/tracks/${track.id}-${track.slug}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink hover:underline">
                  {track.title}
                </p>
                <p className="text-xs text-muted">
                  {track.artist?.name} · {formatDate(track.updatedAt, locale)} ·{' '}
                  {track.visibility}
                </p>
              </Link>
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
              <Badge
                tone={
                  track.publishStatus === 'published'
                    ? 'cyan'
                    : track.publishStatus === 'scheduled'
                      ? 'warning'
                      : 'neutral'
                }
              >
                {t(`studio.publish.${track.publishStatus}`)}
              </Badge>
              <span className="text-xs tabular-nums text-muted">
                {formatNumber(track.qualifiedPlays, locale)} {t('common.plays')}
              </span>
              {!demoMode ? <TrackChangeUploader trackId={track.id} /> : null}
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
    </div>
  );
}
