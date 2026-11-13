import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase, serviceClient } from '@/lib/data/supabase-store';
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
  const data = getStudioData(demoMode ? readDb() : await loadDbFromSupabase(), user, {
    demoDailyLimit: env.uploadDailyLimit,
  });
  const { data: approvedLyrics } =
    !demoMode && data.tracks.length
      ? await serviceClient()
          .from('tracks')
          .select('id,synced_lyrics_srt')
          .in(
            'id',
            data.tracks.map((track) => track.id),
          )
      : { data: [] };
  const { data: changeRequests } =
    !demoMode && data.tracks.length
      ? await serviceClient()
          .from('track_change_requests')
          .select('track_id,change_type,status,created_at')
          .eq('artist_user_id', user.id)
          .in(
            'track_id',
            data.tracks.map((track) => track.id),
          )
          .order('created_at', { ascending: false })
      : { data: [] };

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
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                Song status
              </span>
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
              {!demoMode ? (
                <div className="w-full space-y-2 rounded-xl border border-white/10 bg-white/[0.025] p-3">
                  <p className="text-xs font-bold text-fuchsia-200">
                    Lyrics & artwork approval (separate from song status)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(['srt', 'lyrics_text', 'artwork'] as const).map((kind) => {
                      const latest = changeRequests?.find(
                        (request) =>
                          request.track_id === track.id && request.change_type === kind,
                      );
                      return (
                        <span
                          key={kind}
                          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-muted"
                        >
                          {kind === 'srt'
                            ? 'SRT lyrics'
                            : kind === 'lyrics_text'
                              ? 'Pasted lyrics'
                              : 'Cover artwork'}
                          :{' '}
                          <strong
                            className={
                              latest?.status === 'approved'
                                ? 'text-emerald-300'
                                : latest?.status === 'pending'
                                  ? 'text-amber-300'
                                  : latest?.status === 'rejected'
                                    ? 'text-rose-300'
                                    : 'text-muted'
                            }
                          >
                            {latest?.status ?? 'Not submitted'}
                          </strong>
                        </span>
                      );
                    })}
                  </div>
                  <TrackChangeUploader
                    trackId={track.id}
                    hasApprovedSrt={Boolean(
                      approvedLyrics?.find((item) => item.id === track.id)
                        ?.synced_lyrics_srt,
                    )}
                  />
                </div>
              ) : null}
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
