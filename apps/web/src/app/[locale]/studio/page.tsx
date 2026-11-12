import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BarChart3, Heart, Mic2, Users } from 'lucide-react';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
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
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const data = getStudioData(db, user, { demoDailyLimit: env.uploadDailyLimit });

  return (
    <div className="space-y-8">
      <section className="card space-y-5 p-6" aria-label="Artist getting started">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">ARTIST STUDIO · GET STARTED</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Your music journey, step by step</h2>
          <p className="mt-1 text-sm text-muted">Complete your profile, upload your first track, then follow its review and publication status.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { n: '01', title: 'Set up your artist profile', description: 'Add your stage name, bio and profile image.', done: data.artists.length > 0, href: data.artists.length > 0 ? `/${locale}/studio/artists` : `/${locale}/studio/artists/new`, action: data.artists.length > 0 ? 'Manage profile' : 'Create profile' },
            { n: '02', title: 'Upload your first song', description: 'Upload an MP3 and fill in the song details.', done: data.tracks.length > 0, href: `/${locale}/studio/tracks/new`, action: 'Upload a song' },
            { n: '03', title: 'Track review and release', description: 'See processing, admin review and publication status.', done: data.tracks.some((track) => track.publishStatus === 'published'), href: `/${locale}/studio/tracks`, action: 'View track status' },
          ].map((step, index) => (
            <div key={step.n} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-primary">STEP {step.n}</span>
                <span className="text-xs text-muted">{step.done ? '✓ Complete' : index === 0 || (index === 1 && data.artists.length > 0) || (index === 2 && data.tracks.length > 0) ? 'Next step' : 'Coming up'}</span>
              </div>
              <h3 className="mt-3 font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 min-h-12 text-sm text-muted">{step.description}</p>
              <Link href={step.href} className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">{step.action} →</Link>
            </div>
          ))}
        </div>
      </section>
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
