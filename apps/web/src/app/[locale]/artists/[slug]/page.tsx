import { SeoBreadcrumbs } from '@/components/seo/SeoBreadcrumbs';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import type { Locale } from '@ai-music/contracts';
import { getArtistPage, listableTracks } from '@/lib/data/queries';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getViewer } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { artistJsonLd, buildMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { Artwork } from '@/components/ui/Artwork';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { GenrePlayAllButton } from '@/components/music/GenrePlayAllButton';
import { FlowButton } from '@/components/player/FlowButton';
import { FollowButton } from '@/components/community/FollowButton';
import { ShareButton } from '@/components/community/ShareButton';
import { ReportButton } from '@/components/community/ReportButton';
import { TrackRow } from '@/components/music/TrackRow';
import { AlbumCard } from '@/components/music/AlbumCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, formatNumber } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const safeLocale: Locale = isLocale(raw) ? raw : 'en';
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const page = getArtistPage(db, { userId: null, roles: [] }, slug);
  if (!page)
    return buildMetadata({
      locale: safeLocale,
      title: slug,
      description: '',
      noindex: true,
    });
  return buildMetadata({
    locale: safeLocale,
    title: safeLocale === 'ar'
      ? `${page.artist.name} | أغاني وفنانين على Oddio`
      : `${page.artist.name} — AI Music Artist`,
    description: page.artist.bio
      ? `${page.artist.bio.slice(0, 145)} — Listen on Oddio.`
      : safeLocale === 'ar'
        ? `اكتشف أغاني وإصدارات الفنان ${page.artist.name} على Oddio، واستمع لموسيقى أصلية بالذكاء الاصطناعي.`
        : `Explore ${page.artist.name}'s songs and releases on Oddio. Listen to original AI music and discover more artists.`,
    path: `/artists/${page.artist.slug}`,
    type: 'profile',
    noindex: page.tracks.length === 0,
  });
}

export default async function ArtistPage({
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
  const page = getArtistPage(db, viewer, slug);
  if (!page) notFound();
  const { artist, tracks, albums, followerCount, isFollowing, featuredTrack } = page;
  const queue = featuredTrack
    ? [featuredTrack, ...tracks.filter((track) => track.id !== featuredTrack.id)]
    : tracks;
  const fullyAiCount = tracks.filter(
    (track) => track.productionType === 'fully_ai',
  ).length;
  const assistedCount = tracks.filter(
    (track) => track.productionType === 'ai_assisted',
  ).length;
  const genres = [
    ...new Map(
      tracks
        .filter((track) => track.genre)
        .map((track) => [track.genre!.id, track.genre!]),
    ).values(),
  ].slice(0, 6);
  const relatedArtists = listableTracks(db, viewer)
    .flatMap((track) =>
      track.artist && track.artist.id !== artist.id ? [track.artist] : [],
    )
    .filter(
      (candidate, index, all) =>
        all.findIndex((item) => item.id === candidate.id) === index,
    )
    .slice(0, 4);

  return (
    <div>
      <SeoBreadcrumbs items={[
        { label: locale === 'ar' ? 'الرئيسية' : 'Home', href: `/${locale}` },
        { label: locale === 'ar' ? 'الفنانون' : 'Artists', href: `/${locale}/artists` },
        { label: artist.name, href: `/${locale}/artists/${artist.slug}` },
      ]} />
      <JsonLd
        data={artistJsonLd({
          name: artist.name,
          url: `/${locale}/artists/${artist.slug}`,
          description: artist.bio,
        })}
      />
      <section className="relative mb-8 overflow-hidden rounded-card border border-white/10">
        <div
          className="h-36 w-full sm:h-48"
          style={{
            backgroundImage: `radial-gradient(ellipse at 80% 15%, ${artist.accent}66, transparent 55%), linear-gradient(125deg, #311B25, #191215 75%)`,
          }}
        />
        <div className="relative -mt-14 flex flex-col gap-5 p-5 sm:-mt-16 sm:flex-row sm:items-end sm:p-8">
          <Artwork
            title={artist.name}
            url={artist.avatarUrl || artist.coverUrl}
            accent={artist.accent}
            className="h-28 w-28 shrink-0 border-4 border-background sm:h-36 sm:w-36"
            rounded="rounded-full"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                {t('common.artists')}
              </p>
              {artist.verificationStatus === 'approved' ? (
                <Badge tone="cyan">{t('artist.verified')}</Badge>
              ) : null}
            </div>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {locale === 'ar' ? 'عالم الفنان على Oddio' : 'Inside the artist world'}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
              {artist.name}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {t('artist.followers', { count: formatNumber(followerCount, locale) })} ·{' '}
              {t('artist.joined', { date: formatDate(artist.createdAt, locale) })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <GenrePlayAllButton tracks={queue} ar={locale === 'ar'} />
            {queue.length > 0 ? (
              <FlowButton
                kind="artist"
                seedId={queue[0]!.id}
                locale={locale}
                viewerId={viewer.userId}
              />
            ) : null}
            <FollowButton
              artistId={artist.id}
              initialFollowing={isFollowing}
              labels={{ follow: t('common.follow'), following: t('common.following') }}
            />
            <ShareButton title={artist.name} label={t('common.share')} />
            <ReportButton
              targetType="artist"
              targetId={artist.id}
              label={t('common.report')}
            />
          </div>
        </div>
      </section>

      <section
        aria-label={locale === 'ar' ? 'هوية الفنان الموسيقية' : 'Artist sound identity'}
        className="mb-9 rounded-[1.5rem] border border-primary/20 bg-surface/75 p-5 sm:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.19em] text-primary">
              ARTIST WORLD
            </p>
            <h2 className="mt-2 text-xl font-semibold text-ink">
              {locale === 'ar' ? 'البصمة الموسيقية' : 'The sound behind the name'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
              {artist.bio ||
                (locale === 'ar'
                  ? 'تابع إصدارات الفنان واكتشف أسلوبه الموسيقي.'
                  : 'Explore this artist’s releases and musical identity.')}
            </p>
          </div>
          <Link
            href={`/${locale}/soundspace`}
            className="inline-flex min-h-11 items-center rounded-full border border-primary/40 px-4 text-sm font-semibold text-primary transition hover:bg-primary/10"
          >
            {locale === 'ar' ? 'اكتشف أصوات مشابهة' : 'Explore your soundspace'}
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {genres.map((genre) => (
            <Link
              key={genre.id}
              href={`/${locale}/genres/${genre.slug}`}
              className="inline-flex min-h-10 items-center rounded-full border border-white/15 bg-white/5 px-4 text-xs text-ink transition hover:border-primary/50"
            >
              {locale === 'ar' ? genre.labelAr : genre.labelEn}
            </Link>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted">
          <span className="rounded-lg border border-white/10 px-3 py-2">
            {locale === 'ar'
              ? `${fullyAiCount} أغنية مولّدة بالكامل بالـAI`
              : `${fullyAiCount} fully AI-generated tracks`}
          </span>
          <span className="rounded-lg border border-white/10 px-3 py-2">
            {locale === 'ar'
              ? `${assistedCount} أغنية بمساعدة AI`
              : `${assistedCount} AI-assisted tracks`}
          </span>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_0.4fr]">
        <div>
          <SectionHeader title={t('artist.popular')} />
          {tracks.length === 0 ? (
            <EmptyState title={t('artist.noTracks')} />
          ) : (
            <div className="card divide-y divide-white/5 p-2">
              {tracks.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  queue={tracks}
                  index={index}
                  locale={locale}
                  showArtist={false}
                />
              ))}
            </div>
          )}
        </div>
        <aside className="space-y-6">
          <div className="card p-4">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
              {t('artist.about')}
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink/85">
              {artist.bio || '—'}
            </p>
            {artist.socialLinks.length > 0 ? (
              <div className="mt-4 space-y-1.5">
                {artist.socialLinks
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((link) => (
                    <a
                      key={`${link.platform}-${link.url}`}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="flex items-center gap-1.5 text-xs text-cyan hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {link.platform}
                    </a>
                  ))}
              </div>
            ) : null}
          </div>
          {relatedArtists.length > 0 ? (
            <div className="card p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
                {t('common.artists')}
              </h2>
              <ul className="space-y-2">
                {relatedArtists.map((related) => (
                  <li key={related.id}>
                    <Link
                      href={`/${locale}/artists/${related.slug}`}
                      className="text-sm font-medium text-ink hover:text-primary"
                    >
                      {related.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      {albums.length > 0 ? (
        <section className="mt-12">
          <SectionHeader title={t('artist.releases')} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                accent={album.accent}
                artistName={artist.name}
                artistSlug={artist.slug}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
