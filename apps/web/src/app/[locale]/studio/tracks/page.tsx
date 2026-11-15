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
import { ReviewMusicTags } from '@/components/studio/ReviewMusicTags';
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
          .select('id,synced_lyrics_srt,audio_features')
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

  const approvedCount = data.tracks.filter(
    (track) => track.reviewStatus === 'approved',
  ).length;
  const pendingCount = data.tracks.filter((track) =>
    ['pending_review', 'ready_for_review'].includes(track.reviewStatus),
  ).length;
  const rejectedCount = data.tracks.filter(
    (track) => track.reviewStatus === 'rejected',
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-violet-500/15 to-cyan-500/5 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
            {locale === 'ar' ? 'استوديو الفنان' : 'ARTIST STUDIO'}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-white">
            {locale === 'ar' ? 'أغانيك' : 'Your tracks'}
          </h1>
          <p className="mt-1 text-xs text-muted">
            {locale === 'ar'
              ? 'تابع حالة المراجعة والنشر وعدّل تفاصيل كل أغنية بسهولة.'
              : 'Track review, publishing and updates in one place.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: locale === 'ar' ? 'كل الأغاني' : 'All tracks',
            count: data.tracks.length,
            color: 'text-white',
          },
          {
            label: locale === 'ar' ? 'مقبولة' : 'Approved',
            count: approvedCount,
            color: 'text-emerald-300',
          },
          {
            label: locale === 'ar' ? 'قيد المراجعة' : 'In review',
            count: pendingCount,
            color: 'text-amber-300',
          },
          {
            label: locale === 'ar' ? 'مرفوضة' : 'Rejected',
            count: rejectedCount,
            color: 'text-rose-300',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
          >
            <p className="text-xs text-muted">{stat.label}</p>
            <p className={`mt-2 text-3xl font-extrabold ${stat.color}`}>{stat.count}</p>
          </div>
        ))}
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
        <div className="space-y-3">
          {data.tracks.map((track) => (
            <article
              key={track.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition-colors hover:border-violet-400/30"
            >
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
                {locale === 'ar' ? 'حالة المراجعة' : 'Review'}
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
                <details className="group w-full rounded-xl border border-white/10 bg-black/20 p-3 open:border-violet-400/30">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold text-fuchsia-200 marker:hidden">
                    <span>
                      {locale === 'ar'
                        ? 'الكلمات والغلاف · عرض وإدارة الطلبات'
                        : 'Lyrics & cover artwork · View and manage requests'}
                    </span>
                    <span className="text-muted group-open:rotate-180">⌄</span>
                  </summary>
                  <div className="mt-3 space-y-3">
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
                </details>
              ) : null}
              {(() => {
                const details = approvedLyrics?.find((item) => item.id === track.id)
                  ?.audio_features as {
                    tagSuggestion?: {
                      source?: string;
                      genreSlug?: string;
                      moodSlugs?: string[];
                      confidence?: number;
                      evidenceCount?: number;
                    };
                    artistApprovedTags?: unknown;
                  } | null | undefined;
                const suggestion = details?.tagSuggestion;
                if (demoMode || details?.artistApprovedTags
                  || track.publishStatus !== 'unpublished'
                  || !['draft', 'ready_for_review', 'changes_requested'].includes(track.reviewStatus)
                  || suggestion?.source !== 'artist-reviewed-local-model-v1'
                  || typeof suggestion.genreSlug !== 'string'
                  || !Array.isArray(suggestion.moodSlugs)
                  || typeof suggestion.confidence !== 'number'
                  || typeof suggestion.evidenceCount !== 'number') return null;
                return <ReviewMusicTags
                  trackId={track.id}
                  locale={locale}
                  proposal={{
                    source: suggestion.source,
                    genreSlug: suggestion.genreSlug,
                    moodSlugs: suggestion.moodSlugs,
                    confidence: suggestion.confidence,
                    evidenceCount: suggestion.evidenceCount,
                  }}
                />;
              })()}
              <StudioTrackActions
                trackId={track.id}
                canSubmit={['draft', 'changes_requested', 'ready_for_review'].includes(
                  track.reviewStatus,
                )}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
