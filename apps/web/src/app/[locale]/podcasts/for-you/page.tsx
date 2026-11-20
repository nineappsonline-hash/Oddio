import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Compass, Sparkles } from 'lucide-react';
import { buildMetadata } from '@/lib/seo';
import { isLocale } from '@/i18n/config';
import { getSessionUser } from '@/lib/auth/session';
import { serviceClient } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getPodcastCatalog } from '@/lib/podcasts/catalog';
import {
  filterPodcastCatalog,
  getContentLanguagePreference,
} from '@/lib/content-language';
import { recommendPodcasts } from '@/lib/podcasts/recommendations';
import { PodcastEpisodeCard, PodcastShowCard } from '@/components/podcasts/PodcastUI';

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
    path: '/podcasts/for-you',
    title: locale === 'ar' ? 'اكتشف بودكاست مناسب ليك' : 'Discover podcasts for you',
    description:
      locale === 'ar'
        ? 'اكتشف برامج وحلقات بودكاست جديدة حسب اهتماماتك على Oddio.'
        : 'Find new podcast shows and episodes based on the topics you enjoy.',
    noindex: true,
  });
}

export default async function PodcastsForYou({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw,
    ar = locale === 'ar';
  const [user, catalog] = await Promise.all([
    getSessionUser(),
    (async () =>
      filterPodcastCatalog(
        await getPodcastCatalog(),
        await getContentLanguagePreference(),
      ))(),
  ]);

  let followedIds: string[] = [];
  let listenedEpisodeIds: string[] = [];
  let profileUnavailable = false;
  if (user && !demoMode) {
    const db = serviceClient();
    const [follows, history] = await Promise.all([
      db
        .from('podcast_show_follows')
        .select('show_id')
        .eq('user_id', user.id)
        .order('followed_at', { ascending: false })
        .limit(500),
      db
        .from('podcast_listening_progress')
        .select('episode_id,seconds,completed')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(40),
    ]);
    if (follows.error || history.error) {
      profileUnavailable = true;
    } else {
      followedIds = (follows.data ?? []).map((row) => row.show_id as string);
      listenedEpisodeIds = (history.data ?? [])
        .filter((row) => Number(row.seconds) > 0 || row.completed === true)
        .map((row) => row.episode_id as string);
    }
  }

  const recommendations = recommendPodcasts({
    shows: catalog.shows,
    episodes: catalog.episodes,
    followedIds,
    listenedEpisodeIds,
  });
  const showById = new Map(catalog.shows.map((show) => [show.id, show]));
  const categoryById = new Map(
    catalog.categories.map((category) => [category.id, category]),
  );

  return (
    <main className="space-y-9 bg-[#0a0b0d] pb-10 text-white">
      <Link
        href={`/${locale}/podcasts`}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/70 hover:text-white"
      >
        {ar ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        {ar ? 'ارجع للبودكاست' : 'Back to podcasts'}
      </Link>
      <header className="space-y-3 rounded-3xl border border-white/15 bg-gradient-to-br from-[#332641] via-[#201b29] to-[#13151b] p-6 sm:p-9">
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#e1c9f4]">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {ar ? 'اكتشاف بودكاست' : 'PODCAST DISCOVERY'}
        </p>
        <h1 className="text-3xl font-black sm:text-4xl">
          {ar ? 'بودكاست ممكن يعجبك' : 'Podcasts you might love'}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/75">
          {recommendations.personalized && !profileUnavailable
            ? ar
              ? 'اخترنالك برامج قريبة من مواضيع بتتابعها أو سمعت منها قبل كده. الاقتراحات بتتغير مع استماعك.'
              : 'Suggestions based on topics from your followed shows and listening history.'
            : ar
              ? 'دي اقتراحات لاكتشاف برامج متنوعة وأحدث الحلقات. تابع برنامج أو اسمع حلقة عشان نعرف اهتماماتك أكتر.'
              : 'Explore a mix of topics and recent releases. Follow a show or listen to an episode for more relevant picks.'}
        </p>
        {profileUnavailable ? (
          <p role="status" className="text-xs text-[#f6dc9d]">
            {ar
              ? 'مش قادرين نحمّل اهتماماتك دلوقتي، فبنوريك اقتراحات عامة.'
              : 'Your preferences are temporarily unavailable, so these are general suggestions.'}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/${locale}/podcasts/following`}
            className="inline-flex min-h-11 items-center rounded-xl border border-white/25 px-4 text-sm font-bold text-white hover:bg-white/10"
          >
            {ar ? 'برامجي المتابَعة' : 'Following'}
          </Link>
          <Link
            href={`/${locale}/podcasts/history`}
            className="inline-flex min-h-11 items-center rounded-xl border border-white/25 px-4 text-sm font-bold text-white hover:bg-white/10"
          >
            {ar ? 'سجل الاستماع' : 'Listening history'}
          </Link>
        </div>
      </header>

      {recommendations.freshFromFollowing.length ? (
        <section
          className="space-y-4"
          aria-label={ar ? 'أحدث حلقات برامجك' : 'Latest from your shows'}
        >
          <h2 className="text-2xl font-black">
            {ar ? 'حلقات جديدة عليك من برامجك' : 'Unheard episodes from your shows'}
          </h2>
          <p className="text-sm text-white/60">
            {ar
              ? 'من البرامج اللي بتتابعها ولسه ما سمعتهاش.'
              : 'From shows you follow, not yet in your listening history.'}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recommendations.freshFromFollowing.map((episode) => (
              <PodcastEpisodeCard
                key={episode.id}
                episode={episode}
                show={showById.get(episode.showId)}
                locale={locale}
              />
            ))}
          </div>
        </section>
      ) : null}

      {recommendations.recommendations.length ? (
        <section
          className="space-y-4"
          aria-label={ar ? 'برامج مقترحة' : 'Recommended shows'}
        >
          <div className="flex items-center gap-3">
            <Compass className="h-6 w-6 text-[#dfb8ef]" aria-hidden="true" />
            <h2 className="text-2xl font-black">
              {ar ? 'برامج تستاهل تكتشفها' : 'Shows worth discovering'}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {recommendations.recommendations.map(({ show, reason }) => {
              const category = categoryById.get(show.categoryId);
              const label =
                reason === 'similar'
                  ? ar
                    ? 'قريب من اهتماماتك'
                    : 'Similar to your interests'
                  : reason === 'recent'
                    ? ar
                      ? 'حلقات حديثة'
                      : 'Recent episodes'
                    : ar
                      ? 'اكتشف البرنامج'
                      : 'Explore show';
              return (
                <div key={show.id} className="min-w-0 space-y-2">
                  <PodcastShowCard show={show} locale={locale} />
                  <p className="px-1 text-xs text-white/60">
                    {label}
                    {category ? ` · ${ar ? category.nameAr : category.nameEn}` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {recommendations.continueExploring.length ? (
        <section
          className="space-y-4"
          aria-label={ar ? 'حلقات للاستكشاف' : 'Episodes to discover'}
        >
          <h2 className="text-2xl font-black">
            {ar ? 'حلقات ممكن تعجبك' : 'More episodes to discover'}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recommendations.continueExploring.map((episode) => (
              <PodcastEpisodeCard
                key={episode.id}
                episode={episode}
                show={showById.get(episode.showId)}
                locale={locale}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!catalog.shows.length ? (
        <section className="rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-12 text-center">
          <h2 className="text-xl font-bold">
            {ar ? 'مفيش برامج متاحة دلوقتي' : 'No shows available right now'}
          </h2>
          <Link
            href={`/${locale}/podcasts`}
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-bold text-[#1c1522]"
          >
            {ar ? 'اكتشف البودكاست' : 'Browse podcasts'}
          </Link>
        </section>
      ) : null}
    </main>
  );
}
