import Link from 'next/link';
import { ArrowRight, BarChart3, Music2, UsersRound, Play } from 'lucide-react';
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
      <section className="relative isolate min-h-[310px] overflow-hidden rounded-[2rem] border border-fuchsia-400/30 bg-[#180b22] px-6 py-8 shadow-[0_18px_75px_#0008] sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_42%,#b12a8840,transparent_58%),linear-gradient(115deg,#1b0b27_12%,#250d30_62%,#090f28)]" />
        <div className="pointer-events-none absolute inset-y-0 end-0 w-[55%] bg-cover bg-center opacity-75 [mask-image:linear-gradient(to_right,transparent,black_30%)]" style={{backgroundImage:"url('https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=85')"}} />
        <div className="pointer-events-none absolute inset-y-0 end-0 w-[55%] bg-gradient-to-r from-[#1b0b27]/80 via-fuchsia-900/15 to-fuchsia-500/10" />
        <div
          className="pointer-events-none absolute -end-24 -top-28 h-80 w-80 animate-float-slow rounded-full opacity-40 blur-3xl"
          style={{
            background: hero
              ? `radial-gradient(circle, ${hero.artwork.accent}, transparent 68%)`
              : 'radial-gradient(circle, #9D5CFF, transparent 68%)',
          }}
        />
        <div className="pointer-events-none absolute -bottom-32 -start-24 h-72 w-72 rounded-full bg-cyan/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        <div className="relative grid items-center gap-2 md:grid-cols-[1fr_0.8fr]">
          <div className="relative z-10">

            <h1 className="mt-2 max-w-xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              <span className="text-glow-gradient">{t('home.heroTitle')}</span>
            </h1>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted sm:text-sm">
              {t('home.heroSubtitle')}
            </p>

            {hero ? (
              <Link
                href={`/tracks/${hero.id}-${hero.slug}`}
                className="group/featured glass-pill mt-2 inline-flex max-w-full items-center gap-3 rounded-2xl p-2 pe-4 transition hover:border-primary/40 hover:bg-white/[0.06]"
              >
                <Artwork
                  title={hero.title}
                  url={hero.artwork.url}
                  accent={hero.artwork.accent}
                  className="h-9 w-9 shrink-0"
                  rounded="rounded-xl"
                />
                <span className="min-w-0">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-primary">
                    {t('common.featured')}
                  </span>
                  <span className="block truncate text-sm font-bold text-ink">
                    {hero.title}
                  </span>
                  {hero.artist ? (
                    <span className="block truncate text-[11px] text-muted">
                      {hero.artist.name}
                    </span>
                  ) : null}
                </span>
                <span className="ms-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-ink transition group-hover/featured:border-primary/40 group-hover/featured:bg-primary group-hover/featured:text-white">
                  <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                </span>
              </Link>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/${locale}/discover`}
                className="group/cta inline-flex items-center gap-2 rounded-pill bg-[linear-gradient(120deg,#ff77e6,#ed39a6)] px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition duration-300 hover:-translate-y-0.5 hover:shadow-glow-lg"
              >
                {t('home.explore')}
                <ArrowRight className="h-4 w-4 transition group-hover/cta:translate-x-1 rtl:-scale-x-100 rtl:group-hover/cta:-translate-x-1" />
              </Link>
              <Link
                href={`/${locale}/charts`}
                className="inline-flex items-center gap-2 rounded-pill border border-white/15 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-ink backdrop-blur transition hover:border-cyan/40 hover:bg-cyan/10"
              >
                <BarChart3 className="h-4 w-4 text-cyan" />
                {t('home.chartsTeaser')}
              </Link>
            </div>

            <div className="mt-4 grid max-w-xl grid-cols-3 gap-2.5 sm:gap-3">
              {[
                { value: data.stats.tracks, label: t('home.statsTracks'), Icon: Music2, glow: 'border-fuchsia-400/50 bg-fuchsia-500/10 text-fuchsia-300', icon: 'bg-fuchsia-500/20', line: 'from-fuchsia-500/0 via-fuchsia-400 to-fuchsia-500/0' },
                { value: data.stats.artists, label: t('home.statsArtists'), Icon: UsersRound, glow: 'border-sky-400/50 bg-sky-500/10 text-sky-300', icon: 'bg-sky-500/20', line: 'from-sky-500/0 via-sky-400 to-sky-500/0' },
                { value: data.stats.plays, label: t('home.statsPlays'), Icon: Play, glow: 'border-amber-400/50 bg-amber-500/10 text-amber-300', icon: 'bg-amber-500/20', line: 'from-amber-500/0 via-amber-400 to-amber-500/0' },
              ].map((stat) => (
                <div key={stat.label} className={`group relative flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl border p-2.5 shadow-[0_8px_28px_#0004] backdrop-blur transition duration-300 hover:-translate-y-1 hover:brightness-125 sm:gap-3 sm:p-3 ${stat.glow}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-inner sm:h-11 sm:w-11 ${stat.icon}`}>
                    <stat.Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xl font-black leading-none tabular-nums text-white sm:text-2xl">{formatNumber(stat.value, locale)}</span>
                    <span className="mt-1 block text-[9px] font-semibold uppercase leading-tight tracking-wide text-white/80 sm:text-[11px]">{stat.label}</span>
                  </span>
                  <span className={`pointer-events-none absolute inset-x-3 bottom-0 h-px bg-gradient-to-r ${stat.line}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="pointer-events-none hidden md:block" aria-hidden="true" />
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
                      href={`/tracks/${track.id}-${track.slug}`}
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
