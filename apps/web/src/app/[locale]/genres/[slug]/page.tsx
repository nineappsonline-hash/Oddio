import { filterMusicDb, getContentLanguagePreference } from '@/lib/content-language';
import { notFound } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getGenrePage } from '@/lib/data/queries';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import Link from 'next/link';
import { GenreArtwork } from '@/components/music/GenreArtwork';
import { getViewer } from '@/lib/auth/session';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { categoryEditorial } from '@/lib/seo/category-editorial';
import { TrackCard } from '@/components/music/TrackCard';
import { ArtistCard } from '@/components/music/ArtistCard';
import { GenrePlayAllButton } from '@/components/music/GenrePlayAllButton';
import { FlowButton } from '@/components/player/FlowButton';
import { TrackRow } from '@/components/music/TrackRow';
import { EmptyState } from '@/components/ui/EmptyState';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const safeLocale: Locale = isLocale(raw) ? raw : 'en';
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const page = getGenrePage(db, { userId: null, roles: [] }, slug);
  const label = page
    ? safeLocale === 'ar'
      ? page.genre.labelAr
      : page.genre.labelEn
    : slug;
  return buildMetadata({
    locale: safeLocale,
    title: label,
    description:
      safeLocale === 'ar'
        ? `استكشف أغاني ${label} على Oddio. اسمع أحدث الموسيقى المصنوعة بالذكاء الاصطناعي في النوع ده، وتعرّف على الفنانين والإصدارات.`
        : `Explore ${label} AI-generated music on Oddio. Listen to new songs, discover artists and browse tracks in this genre.`,
    noindex: !page || page.tracks.length === 0,
    path: `/genres/${slug}`,
  });
}

export const dynamic = 'force-dynamic';

export default async function GenrePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const ar = locale === 'ar';
  const viewer = await getViewer();
  const contentLanguage = await getContentLanguagePreference();
  const db = filterMusicDb(
    demoMode ? readDb() : await loadDbFromSupabase(),
    contentLanguage,
  );
  const page = getGenrePage(db, viewer, slug);
  if (!page) notFound();

  const label = ar ? page.genre.labelAr : page.genre.labelEn;
  const editorial = categoryEditorial('genre', slug, locale);
  const all = page.tracks;
  const byPlays = [...all].sort((a, b) => b.qualifiedPlays - a.qualifiedPlays);
  const newest = [...all].sort(
    (a, b) => Date.parse(b.releaseAt) - Date.parse(a.releaseAt),
  );
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyPlays = new Map<string, number>();
  for (const event of db.playbackEvents) {
    if (!event.qualified || Date.parse(event.occurredAt) < since) continue;
    weeklyPlays.set(event.trackId, (weeklyPlays.get(event.trackId) ?? 0) + 1);
  }
  const trending = [...all]
    .filter((track) => (weeklyPlays.get(track.id) ?? 0) > 0)
    .sort(
      (a, b) =>
        (weeklyPlays.get(b.id) ?? 0) - (weeklyPlays.get(a.id) ?? 0) ||
        b.qualifiedPlays - a.qualifiedPlays,
    )
    .slice(0, 5);
  const genreArtistIds = new Set(all.map((track) => track.artistId));
  const artists = genreArtistIds.size;
  const featuredArtists = db.artists
    .filter((artist) => genreArtistIds.has(artist.id))
    .map((artist) => ({
      ...artist,
      trackCount: all.filter((track) => track.artistId === artist.id).length,
      followerCount: db.artistFollows.filter((follow) => follow.artistId === artist.id)
        .length,
      genrePlays: all
        .filter((track) => track.artistId === artist.id)
        .reduce((sum, track) => sum + track.qualifiedPlays, 0),
    }))
    .sort((a, b) => b.genrePlays - a.genrePlays || b.trackCount - a.trackCount)
    .slice(0, 5);

  const section = (id: string, title: string, subtitle: string, tracks: typeof all) => (
    <section id={id} className="space-y-4 scroll-mt-24">
      <div>
        <h2 className="text-xl font-black tracking-tight text-ink sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      {tracks.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {tracks.map((track) => (
            <TrackCard key={track.id} track={track} queue={tracks} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-7 text-sm text-muted">
          {ar ? 'مفيش أغاني في القسم ده حاليًا.' : 'No tracks in this section yet.'}
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-9 pb-12">
      <Link
        href={`/${locale}/genres`}
        className="inline-flex text-sm font-semibold text-primary hover:underline"
      >
        {ar ? '← كل أنواع الموسيقى' : '← All genres'}
      </Link>

      <header className="relative isolate flex min-h-64 flex-col justify-end overflow-hidden rounded-3xl border border-white/10 bg-[#171420] p-6 sm:min-h-80 sm:p-10">
        <GenreArtwork slug={page.genre.slug} index={0} />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10"
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-2xl space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">
            {ar ? 'اكتشف النوع الموسيقي' : 'EXPLORE THE SOUND'}
          </p>
          <h1 className="text-4xl font-black text-white drop-shadow-lg sm:text-6xl">
            {label}
          </h1>
          <p className="text-sm text-white/80">
            {ar
              ? 'اكتشف أحدث وأشهر الأغاني في النوع ده.'
              : 'The latest releases and most-loved tracks in one place.'}
          </p>
          <div className="flex flex-wrap gap-2 pt-2 text-xs font-semibold text-white">
            <span className="rounded-full border border-white/25 bg-black/40 px-4 py-2">
              {all.length} {ar ? 'أغنية' : 'tracks'}
            </span>
            <span className="rounded-full border border-white/25 bg-black/40 px-4 py-2">
              {artists} {ar ? 'فنان' : 'artists'}
            </span>
          </div>
          <div className="pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {all.length > 0 ? <GenrePlayAllButton tracks={byPlays} ar={ar} /> : null}
              {all.length > 0 ? (
                <FlowButton
                  kind="genre"
                  seedId={page.genre.id}
                  locale={locale}
                  viewerId={viewer.userId}
                />
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {editorial ? (
        <section
          aria-labelledby="about-genre"
          className="max-w-4xl space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
        >
          <h2 id="about-genre" className="text-lg font-bold text-ink sm:text-xl">
            {ar ? `تعرف على موسيقى ${label}` : `About ${label} music`}
          </h2>
          <p className="text-sm leading-8 text-muted">{editorial}</p>
          {featuredArtists.length > 0 ? (
            <p className="text-sm leading-7 text-muted">
              {ar ? 'فنانين في القسم: ' : 'Explore artists in this category: '}
              {featuredArtists.slice(0, 3).map((artist, index) => (
                <span key={artist.id}>
                  {index > 0 ? ' · ' : ''}
                  <Link
                    href={`/${locale}/artists/${artist.slug}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {artist.name}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
        </section>
      ) : null}

      {all.length > 0 ? (
        <nav
          aria-label={ar ? 'أقسام النوع الموسيقي' : 'Genre sections'}
          className="flex flex-wrap gap-2"
        >
          {[
            ['trending', ar ? 'الرائج الآن' : 'Trending now'],
            ['recent', ar ? 'أضيفت مؤخرًا' : 'Recently added'],
            ['popular', ar ? 'الأكثر تشغيلًا' : 'Most played'],
            ['artists', ar ? 'فنانون مميزون' : 'Featured artists'],
            ['all-tracks', ar ? 'كل الأغاني' : 'All tracks'],
          ].map(([id, title]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary/60 hover:bg-primary/15"
            >
              {title}
            </a>
          ))}
        </nav>
      ) : null}

      {all.length === 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <EmptyState
            title={
              ar
                ? 'مفيش أغاني متاحة في النوع ده لسه.'
                : 'No tracks available in this genre yet.'
            }
          />
          <p className="mt-3 text-center text-sm text-muted">
            {ar
              ? 'فيه موسيقى تانية تقدر تكتشفها دلوقتي.'
              : 'There is more music to discover right now.'}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href={`/${locale}/discover`}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-black hover:opacity-90"
            >
              {ar ? 'اكتشف الأغاني' : 'Discover tracks'}
            </Link>
            <Link
              href={`/${locale}/genres`}
              className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-ink hover:bg-white/10"
            >
              {ar ? 'كل الأنواع' : 'All genres'}
            </Link>
          </div>
        </section>
      ) : (
        <>
          {section(
            'trending',
            ar ? 'الرائج الآن' : 'Trending now',
            ar
              ? 'الأكثر استماعًا خلال آخر 7 أيام'
              : 'Most qualified listens in the last 7 days',
            trending,
          )}
          {section(
            'recent',
            ar ? 'أضيفت مؤخرًا' : 'Recently added',
            ar ? 'أحدث الإصدارات في النوع ده' : 'Fresh releases from this genre',
            newest.slice(0, 5),
          )}
          <section id="popular" className="scroll-mt-24 space-y-4">
            <div>
              <h2 className="text-xl font-black text-ink sm:text-2xl">
                {ar ? 'الأكثر تشغيلًا' : 'Most played'}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {ar
                  ? 'أفضل الأغاني حسب إجمالي الاستماعات المؤهلة'
                  : 'Ranked by all-time qualified plays'}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {byPlays.slice(0, 3).map((track, index) => (
                <div
                  key={track.id}
                  className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 to-white/[0.03] p-3"
                >
                  <span className="absolute end-4 top-4 z-20 rounded-full border border-white/20 bg-black/70 px-3 py-1 text-sm font-black text-white">
                    #{index + 1}
                  </span>
                  <TrackCard track={track} queue={byPlays} />
                </div>
              ))}
            </div>
            {byPlays.length > 3 && (
              <div className="card divide-y divide-white/5 p-2">
                {byPlays.slice(3, 10).map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    queue={byPlays}
                    index={index + 3}
                    locale={locale}
                  />
                ))}
              </div>
            )}
          </section>
          {featuredArtists.length > 0 && (
            <section id="artists" className="scroll-mt-24 space-y-4">
              <div>
                <h2 className="text-xl font-black text-ink sm:text-2xl">
                  {ar ? 'فنانون مميزون' : 'Featured artists'}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {ar
                    ? 'فنانون عندهم أغاني في النوع ده، مرتبين حسب الاستماع'
                    : 'Artists in this genre, ranked by qualified plays'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {featuredArtists.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} locale={locale} />
                ))}
              </div>
            </section>
          )}
          <section id="all-tracks" className="scroll-mt-24 space-y-4">
            <div>
              <h2 className="text-xl font-black text-ink sm:text-2xl">
                {ar ? 'كل الأغاني' : 'All tracks'}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {all.length} {ar ? 'أغنية متاحة' : 'available tracks'}
              </p>
            </div>
            <div className="card divide-y divide-white/5 p-2">
              {newest.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  queue={newest}
                  index={index}
                  locale={locale}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
