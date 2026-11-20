import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Headphones, Plus } from 'lucide-react';
import { buildMetadata } from '@/lib/seo';
import { isLocale } from '@/i18n/config';
import { getSessionUser } from '@/lib/auth/session';
import { getPodcastCatalog } from '@/lib/podcasts/catalog';
import {
  filterPodcastCatalog,
  getContentLanguagePreference,
} from '@/lib/content-language';
import { serviceClient } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
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
    path: '/podcasts/following',
    title: locale === 'ar' ? 'برامجي المتابَعة' : 'Following podcasts',
    description:
      locale === 'ar'
        ? 'برامج البودكاست اللي بتتابعها وأحدث حلقاتها على Oddio.'
        : 'The shows you follow and their newest published episodes on Oddio.',
    noindex: true,
  });
}

export default async function FollowingPodcasts({
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
  if (user && !demoMode) {
    const { data, error } = await serviceClient()
      .from('podcast_show_follows')
      .select('show_id')
      .eq('user_id', user.id)
      .order('followed_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    followedIds = (data ?? []).map((entry) => entry.show_id as string);
  }
  const showMap = new Map(catalog.shows.map((show) => [show.id, show]));
  const shows = followedIds.flatMap((id) => {
    const show = showMap.get(id);
    return show ? [show] : [];
  });
  const followedSet = new Set(shows.map((show) => show.id));
  const latestEpisodes = catalog.episodes
    .filter((episode) => followedSet.has(episode.showId))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 18);

  return (
    <main className="space-y-9 bg-[#0a0b0d] pb-10 text-white">
      <Link
        href={`/${locale}/podcasts`}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/70 hover:text-white"
      >
        {ar ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        {ar ? 'ارجع للبودكاست' : 'Back to podcasts'}
      </Link>
      <header className="space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-[#d4b0f4]">
          {ar ? 'مكتبتك الشخصية' : 'YOUR PODCAST LIBRARY'}
        </p>
        <h1 className="text-3xl font-black sm:text-4xl">
          {ar ? 'برامجي المتابَعة' : 'Following'}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/70">
          {ar
            ? 'كل برامج البودكاست اللي بتتابعها، ومعاها أحدث الحلقات المنشورة.'
            : 'All your followed podcast shows, and the latest episodes from them.'}
        </p>
      </header>
      {!user ? (
        <div className="rounded-2xl border border-white/15 bg-white/[0.055] p-6">
          <Headphones className="mb-3 h-8 w-8 text-white/70" />
          <h2 className="text-lg font-bold">
            {ar ? 'سجّل دخول عشان تتابع البرامج' : 'Sign in to follow shows'}
          </h2>
          <Link
            href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/podcasts/following`)}`}
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-bold text-[#19121d]"
          >
            {ar ? 'تسجيل الدخول' : 'Log in'}
          </Link>
        </div>
      ) : demoMode ? (
        <p className="rounded-xl border border-white/15 p-5 text-sm text-white/70">
          {ar
            ? 'المتابعة غير متاحة في وضع العرض التجريبي.'
            : 'Following is not available in demo mode.'}
        </p>
      ) : !shows.length ? (
        <div className="rounded-2xl border border-white/15 bg-white/[0.055] px-6 py-12 text-center">
          <Plus className="mx-auto h-9 w-9 text-white/60" />
          <h2 className="mt-3 text-xl font-bold">
            {ar ? 'لسه متابعتش أي برنامج' : 'No followed shows yet'}
          </h2>
          <p className="mt-2 text-sm text-white/65">
            {ar
              ? 'افتح برنامج بودكاست واضغط تابع البرنامج.'
              : 'Discover a podcast and tap Follow show.'}
          </p>
          <Link
            href={`/${locale}/podcasts`}
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-bold text-[#19121d]"
          >
            {ar ? 'اكتشف البرامج' : 'Explore shows'}
          </Link>
        </div>
      ) : (
        <>
          <section
            className="space-y-4"
            aria-label={ar ? 'البرامج المتابَعة' : 'Followed shows'}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {ar ? 'البرامج اللي بتتابعها' : 'Your shows'}
              </h2>
              <span className="text-sm text-white/65">{shows.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {shows.map((show) => (
                <PodcastShowCard key={show.id} show={show} locale={locale} />
              ))}
            </div>
          </section>
          {latestEpisodes.length ? (
            <section
              className="space-y-4"
              aria-label={ar ? 'الحلقات الجديدة' : 'Latest episodes'}
            >
              <h2 className="text-2xl font-bold">
                {ar ? 'أحدث حلقات برامجك' : 'Latest from your shows'}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {latestEpisodes.map((episode) => (
                  <PodcastEpisodeCard
                    key={episode.id}
                    episode={episode}
                    show={showMap.get(episode.showId)}
                    locale={locale}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
