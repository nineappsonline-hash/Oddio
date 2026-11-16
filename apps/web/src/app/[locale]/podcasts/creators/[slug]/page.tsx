import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, Mic2 } from 'lucide-react';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { getPodcastCatalog } from '@/lib/podcasts/catalog';
import { getContentLanguagePreference, filterPodcastCatalog } from '@/lib/content-language';
import { getSessionUser } from '@/lib/auth/session';
import { serviceClient } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { PodcastShowCard } from '@/components/podcasts/PodcastUI';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{locale:string;slug:string}> }) {
  const {locale:raw, slug} = await params;
  const locale = isLocale(raw) ? raw : 'en';
  if (demoMode) return buildMetadata({locale,path:`/podcasts/creators/${slug}`,title:'Podcast creator',description:'',noindex:true});
  const {data:artist} = await serviceClient().from('artists').select('id,name,bio').eq('slug',slug).maybeSingle();
  const catalog = await getPodcastCatalog();
  const hasSeries = catalog.shows.some(s=>s.artistId === artist?.id);
  return buildMetadata({
    locale,path:`/podcasts/creators/${slug}`,
    title:artist ? `${artist.name} — ${locale==='ar'?'فنان بودكاست':'Podcast creator'}` : 'Podcast creator',
    description:artist?.bio || (locale==='ar'?`استمع لسلاسل بودكاست ${artist?.name ?? ''} على Oddio.`:`Explore podcast series by ${artist?.name ?? ''} on Oddio.`),
    noindex:!artist || !hasSeries,
  });
}

export default async function PodcastCreatorProfile({params}:{params:Promise<{locale:string;slug:string}>}) {
  const {locale,slug}=await params;
  if(!isLocale(locale) || demoMode)notFound();
  const ar=locale==='ar';
  const {data:artist}=await serviceClient().from('artists')
    .select('id,owner_user_id,slug,name,bio,verification_status')
    .eq('slug',slug).maybeSingle();
  if(!artist)notFound();
  const [catalog,viewer]=await Promise.all([getPodcastCatalog(),getSessionUser()]);
  const published = filterPodcastCatalog(catalog,await getContentLanguagePreference())
    .shows.filter(show=>show.artistId===artist.id);
  const owner=viewer?.id===artist.owner_user_id && viewer.artistIds.includes(artist.id);
  if(!published.length && !owner)notFound();

  return <div className="mx-auto max-w-6xl space-y-8 pb-10">
    <Link href={`/${locale}/podcasts/creators`} className="inline-flex min-h-10 items-center text-sm font-semibold text-[#ae8be9] hover:underline">
      {ar?'← فنانو البودكاست':'← Podcast creators'}
    </Link>
    <header className="flex flex-col gap-5 rounded-3xl border border-[#493950] bg-gradient-to-br from-[#2a1e39] to-[#111924] p-6 sm:flex-row sm:items-center sm:p-8">
      <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border border-[#72588b] bg-[#463257] text-[#d2b6f8]" aria-hidden="true"><Mic2 className="h-11 w-11" /></div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[#ae8be9]">{ar?'فنان بودكاست':'PODCAST CREATOR'}</p>
        <h1 className="break-words text-3xl font-black text-white sm:text-4xl">{artist.name}</h1>
        {artist.bio ? <p className="max-w-3xl text-sm leading-7 text-[#ccc1d6]">{artist.bio}</p> : null}
      </div>
      {owner ? <Link href={`/${locale}/podcasts/manage#create-series`} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#49345d] px-4 text-xs font-semibold text-white hover:bg-[#634779]">
        {ar?'+ إنشاء سلسلة':'+ Create a series'} <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
      </Link> : null}
    </header>
    <section className="space-y-5" aria-labelledby="creator-series">
      <h2 id="creator-series" className="text-2xl font-bold text-white">{ar?'سلاسل البودكاست':'Podcast series'} <span className="text-base text-[#b8adbf]">({published.length})</span></h2>
      {published.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {published.map(show=><PodcastShowCard key={show.id} show={show} locale={locale}/>)}
      </div> : <div className="rounded-2xl border border-dashed border-[#54475c] bg-[#241b2d] p-6 text-sm leading-7 text-[#b8adbf]">
        {ar?'لسه ما نشرتش أي سلسلة بودكاست. اضغط على إنشاء سلسلة وابدأ أول برنامج ليك.':'You have not published any podcast series yet. Create a series to start your first podcast.'}
      </div>}
    </section>
    <Link href={`/${locale}/artists/${artist.slug}`} className="inline-flex items-center gap-2 text-sm text-[#ae8be9] hover:underline">
      {ar?'الملف الشخصي الموسيقي للفنان':'View music artist profile'} <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
    </Link>
  </div>;
}
