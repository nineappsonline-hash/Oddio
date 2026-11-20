import { filterMusicDb, getContentLanguagePreference } from '@/lib/content-language';
import { SeoBreadcrumbs } from '@/components/seo/SeoBreadcrumbs';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getPlaylistPage } from '@/lib/data/queries';
import { readRuntimeDb } from '@/lib/data/runtime-store';
import { getViewer } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata, musicPlaylistJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { idFromSegment } from '@/lib/links';
import { Artwork } from '@/components/ui/Artwork';
import { Badge } from '@/components/ui/Badge';
import { PlayButton } from '@/components/player/PlayButton';
import { TrackRow } from '@/components/music/TrackRow';
import { PlaylistReorderableTracks } from '@/components/playlists/PlaylistReorderableTracks';
import { PlaylistFollowButton } from '@/components/playlists/PlaylistFollowButton';
import { ShareButton } from '@/components/community/ShareButton';
import { PlaylistCollaboration } from '@/components/playlists/PlaylistCollaboration';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatNumber } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const safeLocale: Locale = isLocale(raw) ? raw : 'en';
  const db = filterMusicDb(await readRuntimeDb(), await getContentLanguagePreference());
  const page = getPlaylistPage(db, { userId: null, roles: [] }, idFromSegment(id));
  if (!page)
    return buildMetadata({
      locale: safeLocale,
      title: id,
      description: '',
      noindex: true,
    });
  return buildMetadata({
    locale: safeLocale,
    title:
      safeLocale === 'ar'
        ? `قائمة تشغيل ${page.playlist.title}`
        : `${page.playlist.title} — AI Music Playlist`,
    description: page.playlist.description
      ? `${page.playlist.description.slice(0, 145)} — Listen on Oddio.`
      : safeLocale === 'ar'
        ? `اسمع قائمة تشغيل ${page.playlist.title} على Oddio. اكتشف أغاني وموسيقى بالذكاء الاصطناعي ضمن قائمة مختارة للاستماع.`
        : `Listen to ${page.playlist.title} on Oddio. Explore a curated playlist of AI-generated songs and discover new music.`,
    path: `/playlists/${page.playlist.id}`,
    noindex: page.playlist.visibility !== 'public' || page.tracks.length === 0,
  });
}

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);
  const viewer = await getViewer();
  const db = await readRuntimeDb();
  const page = getPlaylistPage(db, viewer, idFromSegment(id));
  if (!page) notFound();
  const { playlist, tracks, isFollowing, canEdit } = page;
  const firstTrack = tracks[0];

  return (
    <div>
      <SeoBreadcrumbs
        items={[
          { label: locale === 'ar' ? 'الرئيسية' : 'Home', href: `/${locale}` },
          {
            label: locale === 'ar' ? 'اكتشف الموسيقى' : 'Discover music',
            href: `/${locale}/discover`,
          },
          { label: playlist.title, href: `/${locale}/playlists/${playlist.id}` },
        ]}
      />
      {playlist.visibility === 'public' ? (
        <JsonLd
          data={musicPlaylistJsonLd({
            name: playlist.title,
            description: playlist.description,
            url: `/${locale}/playlists/${playlist.id}`,
            tracks: tracks.map((track) => ({
              name: track.title,
              url: `/${locale}/tracks/${track.id}-${track.slug}`,
            })),
          })}
        />
      ) : null}
      <section className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end">
        <Artwork
          title={playlist.title}
          accent="#41D9FF"
          className="h-56 w-56 shrink-0 sm:h-64 sm:w-64"
          rounded="rounded-3xl"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              {t('common.playlists')}
            </p>
            {playlist.visibility !== 'public' ? (
              <Badge tone="warning">
                {playlist.visibility === 'private'
                  ? t('common.private')
                  : t('common.unlisted')}
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-ink sm:text-4xl">
            {playlist.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {playlist.ownerName} ·{' '}
            {t('playlist.followers', { count: formatNumber(playlist.followers, locale) })}{' '}
            · {tracks.length} {t('common.tracks')}
          </p>
          {playlist.description ? (
            <p className="mt-3 max-w-2xl text-sm text-muted">{playlist.description}</p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {firstTrack ? (
              <PlayButton track={firstTrack} queue={tracks} size="lg" />
            ) : null}
            <PlaylistFollowButton
              playlistId={playlist.id}
              initialFollowing={isFollowing}
              labels={{ follow: t('common.follow'), following: t('common.following') }}
            />
            <ShareButton title={playlist.title} label={t('common.share')} />
            {canEdit ? (
              <Link
                href={`/${locale}/library`}
                className="rounded-pill border border-white/15 px-4 py-2 text-xs font-semibold text-ink hover:bg-white/5"
              >
                {t('playlist.edit')}
              </Link>
            ) : null}
          </div>
          {viewer.userId && playlist.visibility === 'public' ? (
            <PlaylistCollaboration
              playlistId={playlist.id}
              locale={locale}
              isOwner={canEdit}
            />
          ) : null}
        </div>
      </section>

      <h2 className="mb-3 text-lg font-bold text-ink">{t('playlist.tracks')}</h2>
      {tracks.length === 0 ? (
        <EmptyState title={t('playlist.empty')} />
      ) : canEdit && tracks.length === playlist.trackIds.length ? (
        <PlaylistReorderableTracks
          playlistId={playlist.id}
          initialTracks={tracks}
          locale={locale}
        />
      ) : (
        <div className="card divide-y divide-white/5 p-2">
          {tracks.map((track, index) => (
            <TrackRow
              key={`${track.id}-${index}`}
              track={track}
              queue={tracks}
              index={index}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
