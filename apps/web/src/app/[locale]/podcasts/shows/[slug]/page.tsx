import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { getPodcastCatalog,podcastCategoryLabel } from '@/lib/podcasts/catalog';
import { PodcastArtwork,PodcastEpisodeCard,PodcastEmpty } from '@/components/podcasts/PodcastUI';
import { JsonLd } from '@/components/seo/JsonLd';
import { seoAbsoluteUrl } from '@/lib/seo-origin';

export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{locale:string;slug:string}>}) {
  const {locale:raw,slug}=await params;const locale=isLocale(raw)?raw:'en';const catalog=await getPodcastCatalog(),show=catalog.shows.find(s=>s.slug===slug);
  return buildMetadata({locale,path:`/podcasts/shows/${slug}`,title:show? `${show.title} — Podcast` : 'Podcast show',
    description:show?(show.description || (locale==='ar'?`اسمع حلقات بودكاست ${show.title} على Oddio.`:`Listen to episodes of ${show.title} on Oddio.`)):'',
    noindex:!show});
}
export default async function PodcastShowPage({params}:{params:Promise<{locale:string;slug:string}>}) {
  const {locale,slug}=await params;if(!isLocale(locale))notFound();
  const catalog=await getPodcastCatalog(),show=catalog.shows.find(s=>s.slug===slug);if(!show)notFound();
  const episodes=catalog.episodes.filter(e=>e.showId===show.id),category=catalog.categories.find(c=>c.id===show.categoryId);
  return <div className="space-y-9 pb-8">
    <JsonLd data={{'@context':'https://schema.org','@type':'PodcastSeries',name:show.title,description:show.description,url:seoAbsoluteUrl(`/${locale}/podcasts/shows/${show.slug}`),author:{'@type':'Person',name:show.author},inLanguage:show.language}}/>
    <Link href={`/${locale}/podcasts`} className="text-sm font-semibold text-[#eab997] hover:underline">{locale==='ar'?'← بودكاست':'← Podcasts'}</Link>
    <header className="grid items-center gap-6 rounded-3xl border border-white/10 bg-[#241b2d] p-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:p-8">
      <PodcastArtwork title={show.title} coverUrl={show.coverUrl} className="mx-auto w-full max-w-[220px]"/>
      <div className="min-w-0 space-y-3"><p className="text-xs font-bold uppercase tracking-widest text-[#eab997]">{locale==='ar'?'برنامج بودكاست':'PODCAST SHOW'}</p>
        <h1 className="break-words text-3xl font-black text-white sm:text-4xl">{show.title}</h1>
        <p className="text-sm text-[#b8adbf]">{show.author}</p>
        {show.description?<p className="whitespace-pre-line text-sm leading-8 text-[#d9cede]">{show.description}</p>:null}
        {category?<Link href={`/${locale}/podcasts/categories/${category.slug}`} className="inline-flex rounded-full border border-[#eab997]/40 px-4 py-2 text-xs font-semibold text-[#eab997]">{podcastCategoryLabel(category,locale)}</Link>:null}
      </div>
    </header>
    <section className="space-y-4"><h2 className="text-2xl font-bold text-white">{locale==='ar'?`الحلقات (${episodes.length})`:`Episodes (${episodes.length})`}</h2>
      {episodes.length?<div className="grid gap-3 sm:grid-cols-2">{episodes.map(episode=><PodcastEpisodeCard key={episode.id} episode={episode} show={show} locale={locale}/>)}</div>:<PodcastEmpty locale={locale}/>}
    </section>
  </div>;
}
