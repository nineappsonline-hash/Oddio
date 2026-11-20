import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { getPodcastCatalog } from '@/lib/podcasts/catalog';
import { filterPodcastCatalog, getContentLanguagePreference } from '@/lib/content-language';
import { getSessionUser } from '@/lib/auth/session';
import { PodcastListeningHistory } from '@/components/podcasts/PodcastListeningHistory';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'en';
  return buildMetadata({
    locale,
    path: '/podcasts/history',
    title: locale === 'ar' ? 'سجل استماع البودكاست' : 'Podcast listening history',
    description: locale === 'ar'
      ? 'شوف حلقات البودكاست اللي سمعتها، واللي لسه هتكملها، وتحكم في حالة كل حلقة.'
      : 'Review your completed and unfinished podcast episodes and manage listening progress.',
  });
}

export default async function PodcastHistory({ params }: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw, ar = locale === 'ar';
  const [catalog, user] = await Promise.all([
    (async () => filterPodcastCatalog(
      await getPodcastCatalog(),
      await getContentLanguagePreference(),
    ))(),
    getSessionUser(),
  ]);
  return (
    <main className="space-y-7 bg-[#0a0b0d] pb-10">
      <Link href={`/${locale}/podcasts`}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/70 hover:text-white">
        {ar ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        {ar ? 'ارجع للبودكاست' : 'Back to podcasts'}
      </Link>
      <header className="space-y-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d4b0f4]">
          {ar ? 'سجل استماعك' : 'YOUR LISTENING HISTORY'}
        </p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">
          {ar ? 'حلقات سمعتها وحلقات لسه' : 'Your podcast listening history'}
        </h1>
        <p className="max-w-2xl text-sm leading-8 text-white/70">
          {ar
            ? 'ارجع لأي حلقة بدأتها، شوف اللي خلصته، وعلّم الحلقات كمسموعة أو غير مسموعة. السجل مرتبط بحسابك لما تسجّل دخول.'
            : 'Find unfinished and completed episodes, pick up where you stopped, or mark an episode as played or unplayed. Sign in to sync across devices.'}
        </p>
      </header>
      <PodcastListeningHistory locale={locale} viewerId={user?.id ?? null}
        episodes={catalog.episodes} shows={catalog.shows} />
    </main>
  );
}
