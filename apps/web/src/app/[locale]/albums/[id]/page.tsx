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
import { PlayButton } from '@/components/player/PlayButton';
import { TrackRow } from '@/components/music/TrackRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';

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
    title: safeLocale === 'ar'
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
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const page = getAlbumPage(db, viewer, idFromSegment(id));
  if (!page) notFound();
  const { album, artist, tracks } = page;
  const firstTrack = tracks[0];

  return (
    <div>
      <SeoBreadcrumbs items={[
        { label: locale === 'ar' ? 'الرئيسية' : 'Home', href: `/${locale}` },
        { label: artist.name, href: `/${locale}/artists/${artist.slug}` },
        { label: album.title, href: `/${locale}/albums/${album.id}` },
      ]} />
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
            {tracks.length} {t('common.tracks')}
          </p>
          {album.description ? (
            <p className="mt-3 max-w-2xl text-sm text-muted">{album.description}</p>
          ) : null}
          {firstTrack ? (
            <div className="mt-5">
              <PlayButton track={firstTrack} queue={tracks} size="lg" />
            </div>
          ) : null}
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
    </div>
  );
}
