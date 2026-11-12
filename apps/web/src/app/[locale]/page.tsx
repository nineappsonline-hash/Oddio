import Link from 'next/link';
import { ArrowRight, BarChart3 } from 'lucide-react';
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
import { Badge } from '@/components/ui/Badge';
import { Artwork } from '@/components/ui/Artwork';
import { OddioPlanet } from '@/components/music/OddioPlanet';
import { GenreArtwork } from '@/components/music/GenreArtwork';
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
      <section className="relative isolate overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0b0b18]/55 px-5 py-4 shadow-card backdrop-blur-2xl sm:px-7 sm:py-5">
        <div className="pointer-events-none absolute inset-0 ambient-grid opacity-25" />
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

        <div className="relative grid items-center gap-2 md:grid-cols-[1.2fr_0.8fr]">
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="primary" className="border-primary/50 bg-primary/20">
                {t('home.eyebrow')}
              </Badge>
              <span className="glass-pill inline-flex items-center gap-2 rounded-pill px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                <span className="live-dot" />
                {t('home.liveNow')}
              </span>
            </div>

            <h1 className="mt-2 max-w-2xl text-3xl font-black leading-[1.08] tracking-tight sm:text-4xl xl:text-[2.7rem]">
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
                className="group/cta inline-flex items-center gap-2 rounded-pill bg-[linear-gradient(135deg,#9D5CFF,#7C3AED)] px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition duration-300 hover:-translate-y-0.5 hover:shadow-glow-lg"
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

            <div className="mt-3 grid max-w-md grid-cols-3 gap-2">
              {[
                { value: data.stats.tracks, label: t('home.statsTracks') },
                { value: data.stats.artists, label: t('home.statsArtists') },
                { value: data.stats.plays, label: t('home.statsPlays') },
              ].map((stat, index) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-1.5 backdrop-blur"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <p className="text-lg font-black tabular-nums text-ink sm:text-xl">
                    {formatNumber(stat.value, locale)}
                  </p>
                  <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <OddioPlanet />
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
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-5 pt-2 [scrollbar-width:thin] [scrollbar-color:#9D5CFF_transparent]">
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
        </div>
      </section>

      <section>
        <SectionHeader title={t('home.moods')} />
        <div className="flex flex-wrap gap-2">
          {data.moods.map((mood) => (
            <Link
              key={mood.id}
              href={`/${locale}/moods/${mood.slug}`}
              className="rounded-pill border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-ink transition hover:border-cyan/40 hover:bg-cyan/10"
            >
              {genreLabel(mood)}
              <span className="ms-2 text-xs text-muted">{mood.count}</span>
            </Link>
          ))}
        </div>
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
