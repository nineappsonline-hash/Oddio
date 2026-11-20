import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Mic2, ArrowUpRight } from 'lucide-react';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { getPodcastCatalog } from '@/lib/podcasts/catalog';
import {
  getContentLanguagePreference,
  filterPodcastCatalog,
} from '@/lib/content-language';
import { serviceClient } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getSessionUser } from '@/lib/auth/session';

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
    path: '/podcasts/creators',
    title: locale === 'ar' ? 'فنانو البودكاست | Oddio' : 'Podcast Creators',
    description:
      locale === 'ar'
        ? 'اكتشف فناني البودكاست وسلاسلهم الصوتية المنشورة على Oddio.'
        : 'Discover podcast creators and explore their published series on Oddio.',
  });
}

export default async function PodcastCreators({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ar = locale === 'ar';
  const catalog = filterPodcastCatalog(
    await getPodcastCatalog(),
    await getContentLanguagePreference(),
  );
  const user = await getSessionUser();
  const canPublish = Boolean(
    user?.isArtistManager ||
    user?.roles.some((role) => role === 'admin' || role === 'super_admin'),
  );
  const ids = [
    ...new Set(catalog.shows.map((s) => s.artistId).filter((id): id is string => !!id)),
  ];
  const artists =
    !demoMode && ids.length
      ? ((
          await serviceClient()
            .from('artists')
            .select('id,slug,name,bio,verification_status')
            .in('id', ids)
        ).data ?? [])
      : [];
  const creators = artists.filter(
    (a) =>
      a.verification_status === 'approved' ||
      catalog.shows.some((s) => s.artistId === a.id),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <header className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-[#ae8be9]">
          {ar ? 'مبدعو أوديو' : 'ODDIO PODCAST CREATORS'}
        </p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">
          {ar ? 'فنانو البودكاست' : 'Podcast creators'}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-[#b8adbf]">
          {ar
            ? 'تعرف على الفنانين أصحاب سلاسل البودكاست، وافتح ملف أي فنان لاستكشاف كل سلاسله وحلقاته.'
            : 'Meet the artists behind each podcast series and explore all their shows and episodes.'}
        </p>
      </header>
      {creators.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {creators.map((artist) => {
            const count = catalog.shows.filter(
              (show) => show.artistId === artist.id,
            ).length;
            return (
              <Link
                key={artist.id}
                prefetch={false}
                href={`/${locale}/podcasts/creators/${artist.slug}`}
                className="group rounded-2xl border border-[#43364f] bg-[#241b2d] p-5 transition hover:border-[#ae8be9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ae8be9]"
              >
                <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#403354] text-[#cbb1f0]">
                  <Mic2 className="h-7 w-7" />
                </div>
                <h2 className="text-lg font-bold text-white group-hover:text-[#d5bdf7]">
                  {artist.name}
                </h2>
                {artist.bio ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#b8adbf]">
                    {artist.bio}
                  </p>
                ) : null}
                <span className="mt-4 flex items-center justify-between text-xs font-semibold text-[#ae8be9]">
                  {ar
                    ? `${count} سلسلة`
                    : `${count} podcast ${count === 1 ? 'series' : 'series'}`}
                  <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#54475c] bg-[#241b2d] px-6 py-9 text-sm leading-7 text-[#b8adbf]">
          {ar
            ? 'الفنانين هيظهروا هنا أول ما ينشروا أول سلسلة بودكاست. لو أنت فنان، تقدر تبدأ من استوديو البودكاست.'
            : 'Creators will appear here when their first podcast series goes live. Artists can get started in Podcast Studio.'}
        </div>
      )}
      <Link
        href={
          canPublish
            ? `/${locale}/podcasts/manage#create-series`
            : user
              ? `/${locale}/apply/artist`
              : `/${locale}/signup`
        }
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#6b508a] bg-[#352740] px-5 text-sm font-semibold text-white hover:bg-[#49365b]"
      >
        <Mic2 className="h-4 w-4" />{' '}
        {canPublish
          ? ar
            ? 'أنشئ سلسلة بودكاست'
            : 'Create a podcast series'
          : ar
            ? 'كن فنان بودكاست'
            : 'Become a podcast creator'}{' '}
        <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
      </Link>
    </div>
  );
}
