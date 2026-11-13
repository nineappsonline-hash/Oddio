import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Locale } from '@ai-music/contracts';
import { getHomeData } from '@/lib/data/queries';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getViewer } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Artwork } from '@/components/ui/Artwork';
import { GenreArtwork } from '@/components/music/GenreArtwork';
import { MoodArtwork } from '@/components/music/MoodArtwork';
import { HorizontalCarousel } from '@/components/ui/HorizontalCarousel';
import { TrackCard } from '@/components/music/TrackCard';
import { TrackRow } from '@/components/music/TrackRow';
import { PlayButton } from '@/components/player/PlayButton';
import { ArtistCard } from '@/components/music/ArtistCard';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatNumber } from '@/lib/utils';
import { notFound } from 'next/navigation';

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
    title: t('app.name'),
    description: t('home.heroSubtitle'),
    path: '',
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);
  const viewer = await getViewer();
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const data = getHomeData(db, viewer);
  const hero = data.hero;
  const heroQueue = hero
    ? [hero, ...data.trending.filter((track) => track.id !== hero.id), ...data.latest]
    : data.trending;
  const genreLabel = (genre: { labelEn: string; labelAr: string }) =>
    locale === 'ar' ? genre.labelAr : genre.labelEn;

  return (
    <div className="space-y-8">
      <section className="oddio-editorial-hero relative isolate overflow-hidden rounded-[2rem] px-6 py-8 shadow-[0_24px_80px_#0007] sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -end-16 -top-28 h-72 w-72 rounded-full bg-[#A95F52]/10 blur-3xl" aria-hidden="true" />
        <div className="relative grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(220px,.64fr)]">
          <div className="relative z-10 max-w-xl">
            <p className="oddio-editorial-kicker text-[11px] font-bold sm:text-xs">{t('home.eyebrow')}</p>
            <h1 className="oddio-editorial-headline mt-5 max-w-xl text-4xl sm:text-5xl lg:text-6xl">
              {locale === 'ar' ? 'مساحتك الخاصة للموسيقى.' : 'Your own soundspace.'}
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-[#DDC9C0] sm:text-base">
              {locale === 'ar'
                ? 'اكتشف صوتك المفضل، اسمع الجديد، وارجع للموسيقى اللي بتحبها. موسيقى AI مختارة بعناية.'
                : 'Discover what moves you. Find new sounds, revisit favorites, and explore thoughtfully curated AI music.'}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {hero ? (
                <PlayButton track={hero} queue={heroQueue} size="lg" />
              ) : null}
              <Link
                href={`/${locale}/discover`}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#EAB997]/45 px-5 text-sm font-semibold text-[#F8F0E9] transition hover:bg-white/10 focus-visible:outline"
              >
                {t('home.explore')} <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[360px]">
            {hero ? (
              <div className="oddio-editorial-cover relative mx-auto aspect-square max-w-[270px] overflow-hidden rounded-[1.5rem] border border-[#EAB997]/25 sm:max-w-[330px]">
                <Artwork
                  title={hero.title}
                  url={hero.artwork.url}
                  accent={hero.artwork.accent}
                  className="h-full w-full"
                  rounded="rounded-[1.5rem]"
                />
              </div>
            ) : (
              <div className="aspect-square rounded-[1.5rem] border border-[#EAB997]/20 bg-[radial-gradient(circle_at_60%_40%,#7E4B45,#26171B_65%)]" aria-hidden="true" />
            )}
            {hero ? <p className="mt-5 truncate text-center text-xs font-medium text-[#E4C4B1]">{hero.title} · {hero.artist?.name}</p> : null}
          </div>
        </div>
      </section>

      {data.featured.length > 0 ? (
        <section>
          <SectionHeader
            title={t('home.featured')}
            action={
              <Link
                href={`/${locale}/discover`}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {t('common.seeAll')}
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {data.featured.map((track) => (
              <TrackCard key={track.id} track={track} queue={data.featured} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[1.4fr_0.6fr]">
        <section>
          <SectionHeader
            title={t('home.trending')}
            subtitle={t('player.qualifiedHint')}
          />
          {data.trending.length > 0 ? (
            <div className="card divide-y divide-white/5 p-2">
              {data.trending.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  queue={data.trending}
                  index={index}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <EmptyState title={t('common.noResults')} />
          )}
        </section>

        <section>
          <SectionHeader
            title={t('home.chartsTeaser')}
            subtitle={t('home.chartsTeaserBody')}
          />
          <div className="card p-4">
            <ol className="space-y-3">
              {data.trending.slice(0, 5).map((track, index) => (
                <li key={track.id} className="flex items-center gap-3">
                  <span className="w-5 text-center text-sm font-black text-primary">
                    {index + 1}
                  </span>
                  <Artwork
                    title={track.title}
                    url={track.artwork.url}
                    accent={track.artwork.accent}
                    className="h-9 w-9"
                    rounded="rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/${locale}/tracks/${track.id}-${track.slug}`}
                      className="block truncate text-xs font-semibold text-ink hover:underline"
                    >
                      {track.title}
                    </Link>
                    <p className="truncate text-[11px] text-muted">
                      {track.artist?.name}
                    </p>
                  </div>
                  <span className="text-[11px] tabular-nums text-muted">
                    {formatNumber(track.qualifiedPlays, locale)}
                  </span>
                </li>
              ))}
            </ol>
            <Link
              href={`/${locale}/charts`}
              className="mt-4 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-white/10"
            >
              {t('charts.title')}
              <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
            </Link>
          </div>
        </section>
      </div>

      <section>
        <SectionHeader
          title={t('home.latest')}
          action={
            <Link
              href={`/${locale}/discover?sort=newest`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t('common.seeAll')}
            </Link>
          }
        />
        {data.latest.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {data.latest.slice(0, 5).map((track) => (
              <TrackCard key={track.id} track={track} queue={data.latest} />
            ))}
          </div>
        ) : (
          <EmptyState title={t('common.noResults')} />
        )}
      </section>

      <section>
        <SectionHeader title={t('home.genres')} />
        <HorizontalCarousel label="Genres">
          {data.genres.map((genre, index) => (
            <Link key={genre.id} href={`/${locale}/genres/${genre.slug}`}
              className="group relative flex h-44 w-48 shrink-0 snap-start flex-col justify-end overflow-hidden rounded-[1.5rem] border border-white/15 p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-primary/70 hover:shadow-[0_10px_40px_#9d5cff44] sm:h-48 sm:w-56"
              >
              <GenreArtwork slug={genre.slug} index={index} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090818]/95 via-[#090818]/25 to-transparent" />
              <span className="relative text-xl font-black text-white">{genreLabel(genre)}</span>
              <span className="relative mt-1 text-xs font-medium text-white/65">{genre.count} tracks <ArrowRight className="ms-1 inline h-3 w-3 rtl:-scale-x-100" /></span>
            </Link>
          ))}
        </HorizontalCarousel>
      </section>

      <section>
        <SectionHeader title={t('home.moods')} />
        <HorizontalCarousel label="Moods">
          {data.moods.map((mood) => (
            <Link
              key={mood.id}
              href={`/${locale}/moods/${mood.slug}`}
              className="group relative flex h-52 w-40 shrink-0 snap-start flex-col justify-end overflow-hidden rounded-[1.5rem] border border-white/15 p-4 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-primary/70 hover:shadow-[0_10px_40px_#9d5cff44] sm:h-60 sm:w-44"
            >
              <MoodArtwork slug={mood.slug} />
              <span className="relative text-lg font-black text-white">{genreLabel(mood)}</span>
              <span className="relative mt-1 text-xs text-white/75">{mood.count} tracks <ArrowRight className="ms-1 inline h-3 w-3 rtl:-scale-x-100" /></span>
            </Link>
          ))}
        </HorizontalCarousel>
      </section>

      <section>
        <SectionHeader
          title={t('home.artists')}
          action={
            <Link
              href={`/${locale}/discover`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t('common.seeAll')}
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {data.artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} locale={locale} />
          ))}
        </div>
      </section>

      {data.playlists.length > 0 ? (
        <section>
          <SectionHeader title={t('home.playlists')} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}

      <PageHeader
        title={t('home.fullPlayerHint')}
        className="mb-0 rounded-card border border-white/10 bg-surface/40 p-6"
      />
    </div>
  );
}
