import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { getPodcastCatalog,podcastCategoryLabel } from '@/lib/podcasts/catalog';
import { PodcastShowCard,PodcastEpisodeCard,PodcastEmpty } from '@/components/podcasts/PodcastUI';

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
  const cat=await getPodcastCatalog();const category=cat.categories.find(c=>c.slug===slug);if(!category)notFound();
  const name=podcastCategoryLabel(category,locale),shows=cat.shows.filter(s=>s.categoryId===category.id),ids=new Set(shows.map(s=>s.id));
  const episodes=cat.episodes.filter(e=>ids.has(e.showId)),byId=new Map(shows.map(s=>[s.id,s]));
  return <div className="space-y-9 pb-8">
    <Link href={`/${locale}/podcasts/categories`} className="text-sm font-semibold text-[#eab997] hover:underline">{locale==='ar'?'← كل التصنيفات':'← All podcast categories'}</Link>
    <header className="space-y-3 rounded-3xl border border-white/10 bg-gradient-to-br from-[#382444] to-[#18303c] p-7">
      <p className="text-xs font-bold uppercase tracking-widest text-[#eab997]">{locale==='ar'?'بودكاست حسب التصنيف':'PODCAST CATEGORY'}</p>
      <h1 className="text-3xl font-black text-white sm:text-5xl">{name}</h1>
      <p className="text-sm leading-7 text-[#ded2e4]">{locale==='ar'?category.descriptionAr:category.descriptionEn}</p>
    </header>
    <section className="space-y-4"><h2 className="text-2xl font-bold text-white">{locale==='ar'?'البرامج':'Shows'}</h2>
      {shows.length?<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{shows.map(s=><PodcastShowCard key={s.id} show={s} locale={locale}/>)}</div>:<PodcastEmpty locale={locale} what="shows"/>}
    </section>
    {episodes.length?<section className="space-y-4"><h2 className="text-2xl font-bold text-white">{locale==='ar'?'الحلقات':'Episodes'}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{episodes.map(e=><PodcastEpisodeCard key={e.id} episode={e} show={byId.get(e.showId)} locale={locale}/>)}</div>
    </section>:null}
  </div>;
}
