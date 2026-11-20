import { filterMusicDb, getContentLanguagePreference } from '@/lib/content-language';
import { SeoBreadcrumbs } from '@/components/seo/SeoBreadcrumbs';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getAlbumPage } from '@/lib/data/queries';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getViewer } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata, musicAlbumJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { idFromSegment } from '@/lib/links';
import { Artwork } from '@/components/ui/Artwork';
import { AlbumPlaybackActions } from '@/components/music/AlbumPlaybackActions';
import { TrackRow } from '@/components/music/TrackRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, formatDuration } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const safeLocale: Locale = isLocale(raw) ? raw : 'en';
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const page = getAlbumPage(db, { userId: null, roles: [] }, idFromSegment(id));
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
        ? `ألبوم ${page.album.title} — ${page.artist.name}`
        : `${page.album.title} by ${page.artist.name} — AI Music Album`,
    description: page.album.description
      ? `${page.album.description.slice(0, 150)} — ${page.artist.name} on Oddio.`
      : safeLocale === 'ar'
        ? `اسمع ألبوم ${page.album.title} للفنان ${page.artist.name} على Oddio. استكشف أغاني الألبوم والمزيد من الموسيقى بالذكاء الاصطناعي.`
        : `Listen to ${page.album.title} by ${page.artist.name} on Oddio. Explore tracks from this AI music album and discover more original songs.`,
    path: `/albums/${page.album.id}`,
    type: 'music.album',
  });
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);
  const viewer = await getViewer();
  const db = filterMusicDb(
    demoMode ? readDb() : await loadDbFromSupabase(),
    await getContentLanguagePreference(),
  );
  const page = getAlbumPage(db, viewer, idFromSegment(id));
  if (!page) notFound();
  const { album, artist, tracks } = page;
  const readyTracks = tracks.filter((track) =>
    track.access.allowed && track.audio?.processingStatus === 'ready',
  );
  const totalDurationMs = readyTracks.reduce((sum, track) => sum + Math.max(0, track.durationMs), 0);
  const relatedAlbums = db.albums
    .filter((item) =>
      item.artistId === artist.id &&
      item.id !== album.id &&
      item.status === 'published' &&
      item.visibility === 'public' &&
      Number.isFinite(Date.parse(item.releaseAt)) &&
      Date.parse(item.releaseAt) <= Date.now(),
    )
    .map((item) => getAlbumPage(db, { userId: null, roles: [] }, item.id))
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .filter((item) => item.tracks.some((track) => track.audio?.processingStatus === 'ready' && track.access.allowed))
    .sort((a, b) => b.album.releaseAt.localeCompare(a.album.releaseAt))
    .slice(0, 4);

  return (
    <div>
      <SeoBreadcrumbs
        items={[
          { label: locale === 'ar' ? 'الرئيسية' : 'Home', href: `/${locale}` },
          { label: artist.name, href: `/${locale}/artists/${artist.slug}` },
          { label: album.title, href: `/${locale}/albums/${album.id}` },
        ]}
      />
      <JsonLd
        data={musicAlbumJsonLd({
          title: album.title,
          artistName: artist.name,
          url: `/${locale}/albums/${album.id}`,
          releaseAt: album.releaseAt,
          tracks: tracks.map((track) => ({
            title: track.title,
            url: `/${locale}/tracks/${track.id}-${track.slug}`,
          })),
        })}
      />
      <section className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end">
        <Artwork
          title={album.title}
          url={album.artworkUrl}
          accent={artist.accent}
          className="h-56 w-56 shrink-0 sm:h-64 sm:w-64"
          rounded="rounded-3xl"
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            {t('common.albums')}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-ink sm:text-4xl">
            {album.title}
          </h1>
          <Link
            href={`/${locale}/artists/${artist.slug}`}
            className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
          >
            {t('album.by', { artist: artist.name })}
          </Link>
          <p className="mt-1 text-xs text-muted">
            {t('album.releaseDate', { date: formatDate(album.releaseAt, locale) })} ·{' '}
            {readyTracks.length} {t('common.tracks')}
            {readyTracks.length > 0 ? ` · ${formatDuration(totalDurationMs)}` : ''}
          </p>
          {album.description ? (
            <p className="mt-3 max-w-2xl text-sm text-muted">{album.description}</p>
          ) : null}
          <div className="mt-5">
            <AlbumPlaybackActions tracks={tracks} locale={locale} />
          </div>
        </div>
      </section>

      <h2 className="mb-3 text-lg font-bold text-ink">{t('album.tracks')}</h2>
      {tracks.length === 0 ? (
        <EmptyState title={t('album.noTracks')} />
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
      {relatedAlbums.length > 0 ? (
        <section className="mt-10" aria-labelledby="more-artist-albums">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="more-artist-albums" className="text-lg font-bold text-ink">
              {locale === 'ar' ? `ألبومات تانية من ${artist.name}` : `More from ${artist.name}`}
            </h2>
            <Link href={`/${locale}/artists/${artist.slug}`}
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-primary hover:underline">
              {locale === 'ar' ? 'كل أعمال الفنان' : 'All artist releases'}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {relatedAlbums.map((item) => (
              <Link key={item.album.id} href={`/${locale}/albums/${item.album.id}`}
                className="group min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                <Artwork title={item.album.title} url={item.album.artworkUrl}
                  accent={artist.accent} className="aspect-square w-full" rounded="rounded-xl" />
                <p className="mt-3 truncate text-sm font-semibold text-ink group-hover:text-primary" dir="auto">
                  {item.album.title}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {formatDate(item.album.releaseAt, locale)} · {item.tracks.length} {t('common.tracks')}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
