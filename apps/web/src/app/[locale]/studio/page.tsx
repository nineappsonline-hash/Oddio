import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BarChart3,
  Heart,
  Mic2,
  Users,
  UserRoundPen,
  Disc3,
  ClipboardCheck,
  ArrowUpRight,
} from 'lucide-react';
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
      <section className="space-y-5" aria-label="Artist studio actions">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            ARTIST STUDIO · YOUR WORKSPACE
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">
            Create, manage & release your music
          </h2>
          <p className="mt-1 text-sm text-muted">
            Choose where you want to go. Everything you need is one click away.
          </p>
        </div>
        <div className="flex flex-col gap-5">
          {[
            {
              title: 'Add / Manage Artist',
              description:
                'Create your artist identity, edit your stage name, biography and profile artwork.',
              href:
                data.artists.length > 0
                  ? `/${locale}/studio/artists`
                  : `/${locale}/studio/artists/new`,
              icon: UserRoundPen,
              label: 'ARTIST PROFILE',
              glow: 'from-fuchsia-500/25 via-violet-500/10 to-transparent',
              iconColor: 'text-fuchsia-300',
              status:
                data.artists.length > 0 ? 'Profile created' : 'Create your first artist',
            },
            {
              title: 'Add / Manage Songs',
              description:
                'Upload new tracks, update song information, artwork and manage your music library.',
              href: `/${locale}/studio/tracks`,
              icon: Disc3,
              label: 'YOUR MUSIC',
              glow: 'from-cyan-500/25 via-blue-500/10 to-transparent',
              iconColor: 'text-cyan-300',
              status: `${data.tracks.length} song${data.tracks.length === 1 ? '' : 's'}`,
            },
            {
              title: 'Songs Review and Release',
              description:
                'Follow song reviews, check processing status and see when your music goes live.',
              href: `/${locale}/studio/tracks`,
              icon: ClipboardCheck,
              label: 'REVIEW & RELEASE',
              glow: 'from-amber-500/20 via-rose-500/10 to-transparent',
              iconColor: 'text-amber-300',
              status: `${data.tracks.filter((track) => track.reviewStatus === 'pending_review').length} pending review`,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="studio-motion-card group relative flex min-h-56 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#161526] shadow-lg transition duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_16px_45px_rgba(130,70,255,0.16)] sm:min-h-60 sm:flex-row"
              >
                <div
                  className={`relative flex min-h-44 items-center justify-center overflow-hidden bg-gradient-to-br ${item.glow} sm:min-h-full sm:w-[38%] lg:w-[32%]`}
                >
                  <div
                    aria-hidden="true"
                    className="studio-orbit studio-orbit-outer absolute h-44 w-44 rounded-full border border-dashed border-white/20 bg-white/[0.03] shadow-[0_0_65px_rgba(164,90,255,0.16)]"
                  />
                  <div
                    aria-hidden="true"
                    className="studio-orbit studio-orbit-inner absolute h-36 w-36 rounded-full border border-cyan-300/20"
                  />
                  <div
                    aria-hidden="true"
                    className="studio-glow absolute h-28 w-28 rounded-full bg-primary/20 blur-3xl"
                  />
                  <div className="absolute h-32 w-32 rotate-12 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-sm transition duration-500 group-hover:rotate-0" />
                  <Icon
                    aria-hidden="true"
                    strokeWidth={1.2}
                    className={`studio-feature-icon relative h-24 w-24 drop-shadow-[0_0_25px_rgba(180,130,255,0.35)] sm:h-28 sm:w-28 ${item.iconColor}`}
                  />
                </div>
                <div className="relative flex flex-1 flex-col justify-center p-6 sm:p-8">
                  <div
                    aria-hidden="true"
                    className="studio-sparkle pointer-events-none absolute right-8 top-7 h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_16px_5px_rgba(65,217,255,0.35)]"
                  />
                  <span className="text-xs font-bold tracking-[0.2em] text-primary">
                    {item.label}
                  </span>
                  <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                    {item.title}
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
                    {item.description}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition group-hover:bg-primary/85">
                      Open <ArrowUpRight className="h-4 w-4" />
                    </span>
                    <span className="text-xs text-muted">{item.status}</span>
                  </div>
                </div>
              </Link>
            );
          })}
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
                {track.audio?.objectKey ? (
                  <div className="w-full rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="mb-2 text-xs font-medium text-muted">
                      {locale === 'ar'
                        ? 'اسمع أغنيتك قبل الموافقة'
                        : 'Listen to your uploaded song — including pending review'}
                    </p>
                    <audio
                      controls
                      preload="none"
                      className="w-full"
                      controlsList="nodownload"
                      src={`/api/studio/tracks/${track.id}/preview`}
                    >
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                ) : (
                  <p className="w-full text-xs text-amber-300">
                    {locale === 'ar'
                      ? 'الملف الصوتي غير متاح حاليًا'
                      : 'Audio file is not available yet.'}
                  </p>
                )}
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
