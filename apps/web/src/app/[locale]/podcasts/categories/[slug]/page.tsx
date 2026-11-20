import { filterPodcastCatalog, getContentLanguagePreference } from '@/lib/content-language';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { getPodcastCatalog,podcastCategoryLabel } from '@/lib/podcasts/catalog';
import { PodcastShowCard,PodcastEpisodeCard } from '@/components/podcasts/PodcastUI';

export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{locale:string;slug:string}>}) {
  const {locale:raw,slug}=await params;const locale=isLocale(raw)?raw:'en';
  const catalog=await getPodcastCatalog();const category=catalog.categories.find(c=>c.slug===slug);
  const name=category?podcastCategoryLabel(category,locale):slug;
  return buildMetadata({locale,path:`/podcasts/categories/${slug}`,title:locale==='ar'?`بودكاست ${name}`:`${name} Podcasts & Episodes`,
    description:locale==='ar'?`اكتشف برامج وحلقات بودكاست ${name} على Oddio. استكشف البرامج الجديدة واستمع للحلقات المتاحة.`:`Discover ${name} podcast shows and episodes on Oddio. Explore creators and listen to published episodes.`,
    noindex:!category || !catalog.shows.some(s=>s.categoryId===category.id)});
}
export default async function PodcastCategoryPage({params}:{params:Promise<{locale:string;slug:string}>}) {
  const {locale,slug}=await params;if(!isLocale(locale))notFound();
  const cat=filterPodcastCatalog(await getPodcastCatalog(),await getContentLanguagePreference());const category=cat.categories.find(c=>c.slug===slug);if(!category)notFound();
  const name=podcastCategoryLabel(category,locale),shows=cat.shows.filter(s=>s.categoryId===category.id),ids=new Set(shows.map(s=>s.id));
  const episodes=cat.episodes.filter(e=>ids.has(e.showId)),byId=new Map(shows.map(s=>[s.id,s]));
  return <div className="space-y-9 pb-8">
    <Link href={`/${locale}/podcasts/categories`} className="text-sm font-semibold text-[#e9e9e9] hover:underline">{locale==='ar'?'← كل التصنيفات':'← All podcast categories'}</Link>
    <header className="space-y-3 rounded-3xl border border-white/10 bg-gradient-to-br from-[#382444] to-[#18303c] p-7">
      <p className="text-xs font-bold uppercase tracking-widest text-[#e9e9e9]">{locale==='ar'?'بودكاست حسب التصنيف':'PODCAST CATEGORY'}</p>
      <h1 className="text-3xl font-black text-white sm:text-5xl">{name}</h1>
      <p className="text-sm leading-7 text-[#d1d1d1]">{locale==='ar'?category.descriptionAr:category.descriptionEn}</p>
    </header>
    {shows.length ? (
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-white">{locale==='ar'?'البرامج':'Shows'}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {shows.map(s=><PodcastShowCard key={s.id} show={s} locale={locale}/>)}
        </div>
      </section>
    ) : (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8" aria-live="polite">
        <h2 className="text-xl font-bold text-white">
          {locale==='ar'?'لسه مفيش برامج في التصنيف ده':'No shows in this category yet'}
        </h2>
        <p className="mt-2 text-sm leading-7 text-[#d1d1d1]">
          {locale==='ar'
            ? 'بدل ما تفضل في صفحة فاضية، تقدر تكتشف البرامج والحلقات المتاحة دلوقتي.'
            : 'Explore available shows and episodes instead of reaching a dead end.'}
        </p>
        <Link href={`/${locale}/podcasts`} className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-black hover:bg-white/90">
          {locale==='ar'?'اكتشف البودكاست المتاح':'Explore available podcasts'}
        </Link>
      </section>
    )}
    {episodes.length?<section className="space-y-4"><h2 className="text-2xl font-bold text-white">{locale==='ar'?'الحلقات':'Episodes'}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{episodes.map(e=><PodcastEpisodeCard key={e.id} episode={e} show={byId.get(e.showId)} locale={locale}/>)}</div>
    </section>:null}
  </div>;
}
