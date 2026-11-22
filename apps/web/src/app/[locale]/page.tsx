import { filterMusicDb, getContentLanguagePreference } from '@/lib/content-language';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Disc3 } from 'lucide-react';
import type { Locale } from '@ai-music/contracts';
import { getHomeData } from '@/lib/data/queries';
import { recommendTracks } from '@/lib/data/recommendations';
import { getRecentHomeTracks } from '@/lib/data/home-recent';
import { getFollowedArtistReleases } from '@/lib/data/followed-releases';
import { getDiscoveryArtists } from '@/lib/data/discovery-artists';
import { DiscoveryMixShelf } from '@/components/music/DiscoveryMixShelf';
import { ContinueListeningHome } from '@/components/music/ContinueListeningHome';
import { FollowedReleasesHome } from '@/components/music/FollowedReleasesHome';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getViewer } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { Artwork } from '@/components/ui/Artwork';
import { GenreArtwork } from '@/components/music/GenreArtwork';
import { MoodArtwork } from '@/components/music/MoodArtwork';
import { TrackCard } from '@/components/music/TrackCard';
import { TrackRow } from '@/components/music/TrackRow';
import { PlayButton } from '@/components/player/PlayButton';
import { ArtistCard } from '@/components/music/ArtistCard';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { notFound } from 'next/navigation';
import { OddioGlyph } from '@/components/ui/OddioGlyph';

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
  const ar = locale === 'ar';
  const t = createTranslator(locale);
  const viewer = await getViewer();
  const contentLanguage = await getContentLanguagePreference();
  const db = filterMusicDb(
    demoMode
      ? readDb()
      : await loadDbFromSupabase({ homeOnly: true, homeViewerId: viewer.userId }),
    contentLanguage,
  );
  const data = getHomeData(db, viewer);
  const recommended = recommendTracks(db, viewer, 20);
  const publicRecommended = viewer.userId
    ? recommendTracks(db, { userId: null, roles: [] }, 20)
    : recommended;
  const discoveryArtists = getDiscoveryArtists(db, viewer);
  const recentTracks = getRecentHomeTracks(db, viewer, 8);
  const followedReleases = getFollowedArtistReleases(db, viewer, 8);
  const hero = data.hero;
  const heroQueue = hero
    ? [
        hero,
        ...data.trending.filter((item) => item.id !== hero.id),
        ...data.latest.filter((item) => item.id !== hero.id),
      ]
    : data.trending;
  const label = (item: { labelEn: string; labelAr: string }) =>
    ar ? item.labelAr : item.labelEn;

  return (
    <div className="oddio-home-dashboard">
      <header className="oddio-home-intro">
        <div>
          <p className="oddio-micro-label">
            <span className="oddio-live-dot" />{' '}
            {ar ? 'موسيقى على مزاجك' : 'YOUR MUSIC UNIVERSE'}
          </p>
          <h1>{ar ? 'اكتشف صوتك.' : 'Find your frequency.'}</h1>
          <p>
            {ar
              ? 'اكتشف واسمع أغاني أصلية وموسيقى بالذكاء الاصطناعي، وتعرّف على فنانين جدد واستكشف أنواع موسيقية تناسب مزاجك.'
              : 'Discover and listen to original AI-generated music, new songs, independent AI music artists and playlists for every mood.'}
          </p>
        </div>
        <Link href={`/${locale}/discover`} className="oddio-intro-link">
          {ar ? 'كل الموسيقى' : 'Explore music'}{' '}
          <ArrowUpRight size={16} className="rtl:-scale-x-100" />
        </Link>
      </header>

      <div className="oddio-home-feature-grid">
        <section
          className="oddio-featured-stage"
          aria-label={ar ? 'الأغنية المختارة' : 'Featured track'}
        >
          <div className="oddio-featured-waves" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="oddio-featured-copy">
            <p className="oddio-stage-label">
              <OddioGlyph name="soundspace" size={15} />
              {ar ? 'اختيار أوديو' : 'THE ODDIO EDIT'}
            </p>
            <h2>
              {hero ? hero.title : ar ? 'موسيقى تستاهل تسمعها.' : 'Music worth hearing.'}
            </h2>
            <p className="oddio-featured-subtitle">
              {hero
                ? (hero.artist?.name ?? t('home.heroSubtitle'))
                : ar
                  ? 'استكشف عالم من الأغاني الأصلية المصنوعة بالذكاء الاصطناعي.'
                  : 'Discover original sounds made with AI, curated for real listening.'}
            </p>
            <div className="oddio-stage-actions">
              {hero ? (
                <PlayButton
                  track={hero}
                  queue={heroQueue}
                  size="lg"
                  className="oddio-stage-play"
                />
              ) : null}
              <Link href={`/${locale}/discover`} className="oddio-stage-secondary">
                {ar ? 'اكتشف الأغاني' : 'Discover tracks'}{' '}
                <ArrowRight size={16} className="rtl:-scale-x-100" />
              </Link>
            </div>
          </div>
          <div className="oddio-featured-visual" aria-hidden={!hero}>
            <div className="oddio-featured-disc" aria-hidden="true" />
            {hero ? (
              <Artwork
                title={hero.title}
                url={hero.artwork.url}
                accent={hero.artwork.accent}
                className="oddio-featured-album"
                priority
                rounded="rounded-[1.4rem]"
              />
            ) : (
              <Disc3
                className="oddio-featured-placeholder"
                strokeWidth={0.75}
                aria-hidden="true"
              />
            )}
          </div>
        </section>
        <Link
          href={`/${locale}/soundspace`}
          className="oddio-featured-tile oddio-featured-mood"
        >
          <span className="oddio-tile-icon">
            <OddioGlyph name="soundspace" size={23} />
          </span>
          <div>
            <p className="oddio-micro-label">{ar ? 'عيش المود' : 'MADE FOR YOUR MOOD'}</p>
            <h2>{ar ? 'الموسيقى على مزاجك.' : 'Tune into your mood.'}</h2>
            <span>
              {ar ? 'اختار إحساسك وخلي الباقي علينا' : 'Explore Soundspace'}{' '}
              <ArrowUpRight size={15} />
            </span>
          </div>
        </Link>
      </div>

      <ContinueListeningHome locale={locale} />
      {viewer.userId && followedReleases.length > 0 ? (
        <FollowedReleasesHome
          locale={locale}
          viewerId={viewer.userId}
          tracks={followedReleases}
        />
      ) : null}

      {recommended.tracks.length > 0 ? (
        <DiscoveryMixShelf
          tracks={recommended.tracks}
          publicTracks={publicRecommended.tracks}
          genres={db.genres
            .filter((genre) => genre.active)
            .map((genre) => ({ id: genre.id, name: ar ? genre.labelAr : genre.labelEn }))}
          personalized={recommended.personalized}
          locale={locale}
          viewerId={viewer.userId}
        />
      ) : null}

      {viewer.userId && recentTracks.length > 0 ? (
        <section
          className="oddio-dashboard-section"
          aria-label={ar ? 'استمعت مؤخرًا' : 'Recently played'}
        >
          <div className="oddio-section-title-row">
            <div>
              <p className="oddio-micro-label">
                {ar ? 'كمّل مع موسيقاك' : 'PICK UP WHERE YOU LEFT OFF'}
              </p>
              <h2>{ar ? 'سمعتها مؤخرًا' : 'Recently played'}</h2>
              <p className="text-sm text-muted">
                {ar
                  ? 'أغاني من سجل استماعك، ظاهرة ليك إنت بس.'
                  : 'From your own listening history, visible only to you.'}
              </p>
            </div>
            <Link href={`/${locale}/library`} className="oddio-section-action">
              {ar ? 'مكتبتك' : 'Your library'}{' '}
              <ArrowRight size={16} className="rtl:-scale-x-100" />
            </Link>
          </div>
          <div className="oddio-explore-results-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recentTracks.map((track) => (
              <TrackCard key={track.id} track={track} queue={recentTracks} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="oddio-dashboard-section oddio-genres-section">
        <div className="oddio-section-title-row">
          <div>
            <p className="oddio-micro-label">{ar ? 'ابدأ من هنا' : 'FIND YOUR SOUND'}</p>
            <h2>{ar ? 'استكشف حسب النوع' : 'Explore by genre'}</h2>
          </div>
          <Link href={`/${locale}/genres`} className="oddio-section-action">
            {ar ? 'شوف الكل' : 'See all'}{' '}
            <ArrowRight size={16} className="rtl:-scale-x-100" />
          </Link>
        </div>
        {data.genres.length > 0 ? (
          <div className="oddio-genre-grid">
            {data.genres.slice(0, 6).map((genre, index) => (
              <Link
                key={genre.id}
                href={`/${locale}/genres/${genre.slug}`}
                className="oddio-genre-tile"
              >
                <GenreArtwork slug={genre.slug} index={index} />
                <span className="oddio-genre-overlay" />
                <span className="oddio-genre-label">{label(genre)}</span>
                <ArrowUpRight className="oddio-genre-arrow" size={17} />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title={t('common.noResults')} />
        )}
      </section>

      <div className="oddio-home-editorial-columns">
        <section className="oddio-dashboard-section oddio-releases-section">
          <div className="oddio-section-title-row">
            <div>
              <p className="oddio-micro-label">
                {ar ? 'لسه نازلة' : 'HOT OFF THE STUDIO'}
              </p>
              <h2>{ar ? 'أحدث الإصدارات' : 'Fresh AI releases'}</h2>
            </div>
            <Link
              href={`/${locale}/discover?sort=newest`}
              className="oddio-section-action"
            >
              {ar ? 'كل الجديد' : 'See all'}{' '}
              <ArrowRight size={16} className="rtl:-scale-x-100" />
            </Link>
          </div>
          {data.latest.length ? (
            <div className="oddio-release-grid">
              {data.latest.slice(0, 4).map((track) => (
                <TrackCard key={track.id} track={track} queue={data.latest} />
              ))}
            </div>
          ) : (
            <EmptyState title={t('common.noResults')} />
          )}
        </section>
        <section className="oddio-dashboard-section oddio-artists-section">
          <div className="oddio-section-title-row">
            <div>
              <p className="oddio-micro-label">
                {ar ? 'أصوات تستحق الاكتشاف' : 'VOICES TO KNOW'}
              </p>
              <h2>{ar ? 'فنانين تستمع لهم' : 'Featured AI artists'}</h2>
            </div>
            <Link href={`/${locale}/discover`} className="oddio-section-action">
              {ar ? 'شوف الكل' : 'See all'}{' '}
              <ArrowRight size={16} className="rtl:-scale-x-100" />
            </Link>
          </div>
          {data.artists.length ? (
            <div className="oddio-artists-grid">
              {data.artists.slice(0, 4).map((artist) => (
                <ArtistCard key={artist.id} artist={artist} locale={locale} />
              ))}
            </div>
          ) : (
            <EmptyState title={t('common.noResults')} />
          )}
        </section>
      </div>

      {discoveryArtists.spotlight ? (
        <section
          className="oddio-dashboard-section"
          aria-label={ar ? 'فنان تحت الضوء' : 'Artist spotlight'}
        >
          <div className="oddio-section-title-row">
            <div>
              <p className="oddio-micro-label">ODDIO SPOTLIGHT</p>
              <h2>{ar ? 'فنان تحت الضوء' : 'Artist Spotlight'}</h2>
              <p className="text-sm text-muted">
                {ar
                  ? 'اختيار تحريري أو فنان مستقل من تدوير أسبوعي.'
                  : 'Editorial choice or a weekly rotating independent artist.'}
              </p>
            </div>
          </div>
          <div className="max-w-64">
            <ArtistCard artist={discoveryArtists.spotlight} locale={locale} />
          </div>
        </section>
      ) : null}

      {discoveryArtists.rising.length > 0 ? (
        <section
          className="oddio-dashboard-section"
          aria-label={ar ? 'فنانين صاعدين' : 'Rising artists'}
        >
          <div className="oddio-section-title-row">
            <div>
              <p className="oddio-micro-label">RISING ON ODDIO</p>
              <h2>{ar ? 'فنانين يستحقوا فرصة' : 'Rising Artists'}</h2>
              <p className="text-sm text-muted">
                {ar
                  ? 'فنانين متاحين للاستماع ومش بالضرورة الأكثر شهرة، بتدوير أسبوعي.'
                  : 'Playable independent voices, not just the most-streamed artists; rotated weekly.'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {discoveryArtists.rising.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="oddio-dashboard-section">
        <div className="oddio-section-title-row">
          <div>
            <p className="oddio-micro-label">
              {ar ? 'لكل لحظة إحساس' : 'SOUNDTRACKS FOR LIFE'}
            </p>
            <h2>{ar ? 'على حسب مودك' : 'Made for your mood'}</h2>
          </div>
          <Link href={`/${locale}/soundspace`} className="oddio-section-action">
            {ar ? 'جرّب Soundspace' : 'Open Soundspace'}{' '}
            <ArrowRight size={16} className="rtl:-scale-x-100" />
          </Link>
        </div>
        <div className="oddio-mood-grid">
          {data.moods.slice(0, 5).map((mood) => (
            <Link
              href={`/${locale}/moods/${mood.slug}`}
              key={mood.id}
              className="oddio-mood-card"
            >
              <MoodArtwork slug={mood.slug} />
              <span className="oddio-mood-shade" />
              <span className="oddio-mood-caption">
                <strong>{label(mood)}</strong>
                <small>
                  {mood.count} {ar ? 'أغاني' : 'tracks'}
                </small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="oddio-home-bottom-columns">
        <section className="oddio-dashboard-section">
          <div className="oddio-section-title-row">
            <div>
              <p className="oddio-micro-label">{ar ? 'الناس بتسمع إيه' : 'ON REPEAT'}</p>
              <h2>{ar ? 'الأكثر استماعًا' : 'Trending right now'}</h2>
            </div>
            <Link href={`/${locale}/charts`} className="oddio-section-action">
              {ar ? 'الترتيب' : 'Charts'}{' '}
              <ArrowRight size={16} className="rtl:-scale-x-100" />
            </Link>
          </div>
          {data.trending.length ? (
            <div className="oddio-track-list">
              {data.trending.slice(0, 5).map((track, index) => (
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
        <section className="oddio-dashboard-section oddio-curated-section">
          <div className="oddio-section-title-row">
            <div>
              <p className="oddio-micro-label">
                {ar ? 'خلّي الموسيقى مستمرة' : 'KEEP THE MUSIC MOVING'}
              </p>
              <h2>{ar ? 'قوائم مختارة' : 'Curated playlists'}</h2>
            </div>
          </div>
          {data.playlists.length ? (
            <div className="oddio-playlists-grid">
              {data.playlists.slice(0, 2).map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} locale={locale} />
              ))}
            </div>
          ) : (
            <Link href={`/${locale}/soundspace`} className="oddio-curated-empty">
              <OddioGlyph name="library" size={35} />
              <strong>
                {ar ? 'اكتشف موسيقى جديدة' : 'A playlist for every feeling.'}
              </strong>
              <span>
                {ar
                  ? 'مساحة موسيقية على حسب مودك'
                  : 'Find your next sound in Soundspace.'}
              </span>
              <span className="oddio-curated-cta">
                {ar ? 'ابدأ الاستكشاف' : 'Start listening'} <ArrowUpRight size={15} />
              </span>
            </Link>
          )}
        </section>
      </div>

      {data.featured.length ? (
        <section className="oddio-dashboard-section oddio-editors-section">
          <div className="oddio-section-title-row">
            <div>
              <p className="oddio-micro-label">
                {ar ? 'اختيار فريق أوديو' : "EDITOR'S PICKS"}
              </p>
              <h2>{ar ? 'مختارة بعناية' : 'The Oddio edit'}</h2>
            </div>
          </div>
          <div className="oddio-editor-picks">
            {data.featured.slice(0, 4).map((track) => (
              <TrackCard key={track.id} track={track} queue={data.featured} />
            ))}
          </div>
        </section>
      ) : null}

      <Link href={`/${locale}/apply/artist`} className="oddio-creator-banner">
        <span className="oddio-creator-icon">
          <OddioGlyph name="studio" size={22} />
        </span>
        <span>
          <strong>{ar ? 'بتعمل موسيقى AI؟' : 'Creating AI music?'}</strong>
          <small>
            {ar ? 'شارك صوتك مع ناس أكتر.' : 'Your next listener is waiting.'}
          </small>
        </span>
        <span className="oddio-creator-arrow">
          <ArrowUpRight size={22} />
        </span>
      </Link>
    </div>
  );
}
