import {
  filterPodcastCatalog,
  getContentLanguagePreference,
} from '@/lib/content-language';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, Mic2, Search } from 'lucide-react';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { getPodcastCatalog } from '@/lib/podcasts/catalog';
import { getSessionUser } from '@/lib/auth/session';
import {
  PodcastCategoryCard,
  PodcastEpisodeCard,
  PodcastShowCard,
  PodcastEmpty,
} from '@/components/podcasts/PodcastUI';
import { PodcastSeriesShelf } from '@/components/podcasts/PodcastSeriesShelf';
import { ContinueListening } from '@/components/podcasts/ContinueListening';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'en';
  return buildMetadata({
    locale,
    path: '/podcasts',
    title:
      locale === 'ar'
        ? 'بودكاست Oddio | اكتشف برامج وحلقات صوتية'
        : 'Podcasts — Shows, Episodes & Categories',
    description:
      locale === 'ar'
        ? 'استكشف البودكاست على Oddio حسب التصنيف: تكنولوجيا، أعمال، تعليم، علوم، ثقافة، كوميديا وقصص. اسمع الحلقات والبرامج الجديدة.'
        : 'Explore podcast shows and episodes on Oddio. Browse technology, business, education, science, culture, comedy, stories and more podcast categories.',
  });
}

export default async function PodcastsHome({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw,
    ar = locale === 'ar';
  const { q: rawQuery } = await searchParams;
  const q = (rawQuery ?? '').trim().slice(0, 100).toLocaleLowerCase();
  const catalog = filterPodcastCatalog(
    await getPodcastCatalog(),
    await getContentLanguagePreference(),
  );
  const user = await getSessionUser();
  const canPublish = Boolean(
    user?.isArtistManager ||
    user?.roles.some((role) => role === 'admin' || role === 'super_admin'),
  );
  const matchingShows = catalog.shows.filter(
    (show) =>
      !q ||
      [show.title, show.description, show.author].some((item) =>
        item.toLocaleLowerCase().includes(q),
      ),
  );
  const matchingShowIds = new Set(matchingShows.map((show) => show.id));
  const matchingEpisodes = catalog.episodes.filter(
    (episode) =>
      !q ||
      matchingShowIds.has(episode.showId) ||
      [episode.title, episode.description].some((item) =>
        item.toLocaleLowerCase().includes(q),
      ),
  );
  const showById = new Map(catalog.shows.map((show) => [show.id, show]));

  return (
    <div className="relative space-y-10 bg-[#0a0b0d] pb-8 text-white">
      <section className="relative isolate overflow-hidden rounded-3xl border border-white/[0.13] bg-gradient-to-br from-[#242527]/90 via-[#161719]/90 to-[#101113]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,.24),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-2xl sm:p-10">
        <div
          className="pointer-events-none absolute -right-12 -top-14 grid h-64 w-64 place-items-center rounded-full border-[32px] border-[#e9e9e9]/10 text-[#e9e9e9]/20"
          aria-hidden="true"
        >
          <Mic2 className="h-32 w-32" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e9e9e9]">
            {ar ? 'عالم البودكاست على Oddio' : 'THE PODCAST SIDE OF ODDIO'}
          </p>
          <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">
            {ar ? 'حكايات وأفكار تستاهل تسمعها.' : 'Listen beyond the music.'}
          </h1>
          <p className="max-w-lg text-sm leading-8 text-[#d1d1d1] sm:text-base">
            {ar
              ? 'اكتشف برامج وحلقات بودكاست في مواضيع مختلفة، من التكنولوجيا والعلوم للأعمال والقصص والثقافة.'
              : 'Explore conversations, perspectives and stories, from science and technology to business, culture and much more.'}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/${locale}/podcasts/categories`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#e9e9e9] px-5 text-sm font-bold text-[#100d13] hover:brightness-110"
            >
              {ar ? 'استكشف التصنيفات' : 'Browse categories'}{' '}
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
            <Link
              href={`/${locale}/podcasts/following`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/[0.10] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.17]"
            >
              {ar ? 'برامجي المتابَعة' : 'Following'}
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
            <Link
              href={`/${locale}/podcasts/history`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/[0.10] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.17]"
            >
              {ar ? 'سجل الاستماع' : 'Listening history'}
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
            <Link
              href={`/${locale}/podcasts/creators`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/[0.07] backdrop-blur-xl px-5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/[0.13]"
            >
              {ar ? 'فنانو البودكاست' : 'Podcast creators'}{' '}
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
            <Link
              href={
                canPublish
                  ? `/${locale}/podcasts/manage#create-series`
                  : user
                    ? `/${locale}/apply/artist`
                    : `/${locale}/signup`
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/[0.10] backdrop-blur-xl px-5 text-sm font-bold text-white transition hover:bg-white/[0.17] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
            >
              <Mic2 className="h-4 w-4" />{' '}
              {canPublish
                ? ar
                  ? '+ أنشئ سلسلة بودكاست'
                  : '+ Create podcast series'
                : ar
                  ? 'ابدأ بودكاست كفنان'
                  : 'Create your own podcast'}
            </Link>
          </div>
        </div>
      </section>

      <form
        action={`/${locale}/podcasts`}
        role="search"
        className="flex max-w-2xl items-center gap-3 rounded-2xl border border-white/[0.14] bg-white/[0.055] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,.07)] backdrop-blur-2xl focus-within:border-white/40"
      >
        <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-[#e9e9e9]" />
        <input
          name="q"
          defaultValue={rawQuery ?? ''}
          aria-label={
            ar ? 'البحث في البرامج والحلقات' : 'Search podcast shows and episodes'
          }
          placeholder={ar ? 'ابحث عن بودكاست أو حلقة...' : 'Search shows and episodes...'}
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#a3a3a3]"
        />
        <button className="min-h-10 shrink-0 rounded-lg bg-white/[0.13] px-4 text-xs font-semibold text-white hover:bg-white/20">
          {ar ? 'بحث' : 'Search'}
        </button>
      </form>

      {!q && catalog.episodes.length > 0 ? (
        <ContinueListening
          locale={locale}
          viewerId={user?.id ?? null}
          episodes={catalog.episodes}
          shows={catalog.shows}
        />
      ) : null}

      {q ? (
        <>
          <h2 className="text-2xl font-bold text-white">
            {ar ? 'نتائج البحث' : 'Search results'}
          </h2>
          {matchingShows.length ? (
            <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {matchingShows.map((show) => (
                <PodcastShowCard key={show.id} show={show} locale={locale} />
              ))}
            </div>
          ) : null}
          {matchingEpisodes.length ? (
            <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {matchingEpisodes.slice(0, 30).map((episode) => (
                <PodcastEpisodeCard
                  key={episode.id}
                  episode={episode}
                  show={showById.get(episode.showId)}
                  locale={locale}
                />
              ))}
            </div>
          ) : null}
          {!matchingShows.length && !matchingEpisodes.length ? (
            <PodcastEmpty locale={locale} what="search" />
          ) : null}
        </>
      ) : (
        <>
          <PodcastSeriesShelf locale={locale} count={catalog.shows.length}>
            {catalog.shows.map((show) => (
              <div
                key={show.id}
                data-podcast-series-card
                className="w-[180px] shrink-0 snap-start sm:w-[210px] lg:w-[230px]"
              >
                <PodcastShowCard show={show} locale={locale} />
              </div>
            ))}
          </PodcastSeriesShelf>
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-white">
                {ar ? 'تصفح التصنيفات' : 'Browse by category'}
              </h2>
              <Link
                href={`/${locale}/podcasts/categories`}
                className="text-sm font-semibold text-[#e9e9e9] hover:underline"
              >
                {ar ? 'كل التصنيفات' : 'All categories'} →
              </Link>
            </div>
            <div className="grid grid-cols-2 items-stretch gap-2.5 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {catalog.categories.slice(0, 10).map((category) => (
                <PodcastCategoryCard
                  key={category.id}
                  category={category}
                  locale={locale}
                />
              ))}
            </div>
          </section>

          <section id="episodes" className="scroll-mt-24 space-y-5">
            <h2 className="text-2xl font-bold text-white">
              {ar ? 'أحدث الحلقات' : 'Latest episodes'}
            </h2>
            {catalog.episodes.length ? (
              <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {catalog.episodes.slice(0, 12).map((episode) => (
                  <PodcastEpisodeCard
                    key={episode.id}
                    episode={episode}
                    show={showById.get(episode.showId)}
                    locale={locale}
                  />
                ))}
              </div>
            ) : (
              <PodcastEmpty locale={locale} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
