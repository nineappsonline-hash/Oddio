import Link from 'next/link';
import { ShareButton } from '@/components/community/ShareButton';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { getPodcastCatalog,podcastCategoryLabel } from '@/lib/podcasts/catalog';
import { PodcastArtwork,PodcastEpisodeRow,PodcastEmpty } from '@/components/podcasts/PodcastUI';
import { JsonLd } from '@/components/seo/JsonLd';
import { seoAbsoluteUrl } from '@/lib/seo-origin';
import { serviceClient } from '@/lib/data/supabase-store';

export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{locale:string;slug:string}>}) {
  const {locale:raw,slug}=await params;const locale=isLocale(raw)?raw:'en';const catalog=await getPodcastCatalog(),show=catalog.shows.find(s=>s.slug===slug);
  const arabic = show ? /[\u0600-\u06FF]/.test(show.title) : locale === 'ar';
  return buildMetadata({
    locale, path:`/podcasts/shows/${slug}`,
    title: show?.title ?? 'Podcast show',
    socialTitle: show?.title,
    description: show
      ? (arabic
        ? `🎙️ بودكاست: ${show.title}\n🎤 تقديم: ${show.author}\n🎧 استمع للحلقات على Oddio.`
        : `🎙️ Podcast: ${show.title}\n🎤 By: ${show.author}\n🎧 Listen on Oddio.`)
      : '',
    noindex: !show,
    image: show?.coverUrl,
    imageAlt: show ? `${show.title} — ${show.author}` : undefined,
  });
}
export default async function PodcastShowPage({params}:{params:Promise<{locale:string;slug:string}>}) {
  const {locale,slug}=await params;if(!isLocale(locale))notFound();
  const catalog=await getPodcastCatalog(),show=catalog.shows.find(s=>s.slug===slug);if(!show)notFound();
  const creator=show.artistId ? (await serviceClient().from('artists').select('slug').eq('id',show.artistId).maybeSingle()).data : null;
  const episodes=catalog.episodes.filter(e=>e.showId===show.id).sort((a,b)=>
    (a.seasonNumber??1)-(b.seasonNumber??1) || (a.episodeNumber??999999)-(b.episodeNumber??999999) || a.publishedAt.localeCompare(b.publishedAt)),category=catalog.categories.find(c=>c.id===show.categoryId);
  return <div className="space-y-9 pb-8">
    <JsonLd data={{'@context':'https://schema.org','@type':'PodcastSeries',name:show.title,description:show.description,url:seoAbsoluteUrl(`/${locale}/podcasts/shows/${show.slug}`),author:{'@type':'Person',name:show.author},inLanguage:show.language}}/>
    <Link href={`/${locale}/podcasts`} className="text-sm font-semibold text-[#e9e9e9] hover:underline">{locale==='ar'?'← بودكاست':'← Podcasts'}</Link>
    <header className="grid items-center gap-6 rounded-3xl border border-white/10 bg-[#202020] p-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:p-8">
      <PodcastArtwork title={show.title} coverUrl={show.coverUrl} className="mx-auto w-full max-w-[220px]"/>
      <div className="min-w-0 space-y-3"><p className="text-xs font-bold uppercase tracking-widest text-[#e9e9e9]">{locale==='ar'?'سلسلة بودكاست':'PODCAST SERIES'}</p>
        <h1 className="break-words text-3xl font-black text-white sm:text-4xl">{show.title}</h1>
        {creator?.slug
          ? <Link href={`/${locale}/podcasts/creators/${creator.slug}`} className="inline-flex min-h-9 items-center text-sm font-semibold text-[#ae8be9] hover:underline" aria-label={locale==='ar'?`افتح ملف بودكاست ${show.author}`:`View ${show.author}'s podcast profile`}>{show.author} ↗</Link>
          : <p className="text-sm text-[#a3a3a3]">{show.author}</p>}
        <ShareButton title={show.title} label={locale==='ar'?'مشاركة':'Share'} url={`/${locale}/podcasts/shows/${show.slug}`} />
        {show.description?<p className="whitespace-pre-line text-sm leading-8 text-[#d9cede]">{show.description}</p>:null}
        {category?<Link href={`/${locale}/podcasts/categories/${category.slug}`} className="inline-flex rounded-full border border-[#e9e9e9]/40 px-4 py-2 text-xs font-semibold text-[#e9e9e9]">{podcastCategoryLabel(category,locale)}</Link>:null}
      </div>
    </header>
    <section className="space-y-5" aria-label={locale==='ar'?'حلقات البودكاست':'Podcast episodes'}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b797d2]">{locale==='ar'?'استمع الآن':'NOW LISTENING'}</p>
          <h2 className="mt-1 text-2xl font-bold text-white">{locale==='ar'?'كل الحلقات':'All episodes'}</h2>
        </div>
        <span className="rounded-full border border-[#64516e] bg-[#271e2e] px-3 py-1.5 text-xs font-bold text-[#d2b9e6]">
          {locale==='ar'?`${episodes.length} حلقات`:`${episodes.length} episodes`}
        </span>
      </div>
      {episodes.length ? (
        <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4">
          {episodes.map((episode,index)=>(
            <PodcastEpisodeRow key={episode.id} episode={episode} show={show} locale={locale} index={index} upcoming={episodes.slice(index+1)}/>
          ))}
        </div>
      ) : <PodcastEmpty locale={locale}/>}
    </section>
  </div>;
}
