import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { getPodcastCatalog,isPodcastId } from '@/lib/podcasts/catalog';
import { PodcastPublisher } from '@/components/podcasts/PodcastPublisher';
import { serviceClient } from '@/lib/data/supabase-store';

export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}) {
  const {locale:raw}=await params;const locale=isLocale(raw)?raw:'en';
  return buildMetadata({locale,path:'/podcasts/manage',noindex:true,title:locale==='ar'?'إدارة البودكاست':'Podcast Publisher',
    description:locale==='ar'?'إدارة برامج وحلقات البودكاست على Oddio.':'Manage and publish Oddio podcast shows and episodes.'});
}
export default async function PodcastManagement({params}:{params:Promise<{locale:string}>}) {
  const {locale:raw}=await params;if(!isLocale(raw))redirect('/en');
  const locale=raw,ar=locale==='ar';
  const user=await getSessionUser();
  if(!user)redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/podcasts/manage`)}`);
  const staff=user.roles.some(r=>r==='admin'||r==='super_admin');
  if(!staff && !user.isArtistManager)redirect(`/${locale}/podcasts`);
  const catalog=await getPodcastCatalog();
  const ready=catalog.categories.every(c=>isPodcastId(c.id));
  const db=ready?serviceClient():null;
  const artistResult=db ? await (staff
    ? db.from('artists').select('id,name,owner_user_id').limit(250)
    : db.from('artists').select('id,name,owner_user_id').in('id',user.artistIds.length?user.artistIds:['00000000-0000-0000-0000-000000000000'])) : null;
  const artistProfiles=(artistResult?.data??[]).filter(a=>staff || a.owner_user_id===user.id).map(a=>({id:a.id,name:a.name}));
  const ownedShows=catalog.shows.filter(show=>staff || (show.artistId!==null && user.artistIds.includes(show.artistId)));
  return <div className="space-y-8 pb-9">
    <header className="space-y-3">
      <p className="text-xs font-black uppercase tracking-widest text-[#eab997]">{ar?'استوديو البودكاست':'PODCAST STUDIO'}</p>
      <h1 className="text-3xl font-black text-white sm:text-4xl">{ar?'أنشئ برامج وحلقات جديدة':'Publish original conversations'}</h1>
      <p className="max-w-3xl text-sm leading-7 text-[#b8adbf]">{ar?'أنشئ برنامج بودكاست ثم ارفع حلقات MP3 إلى Cloudflare R2. الحلقات لا تظهر للجمهور إلا بعد نجاح رفع الملف والتحقق منه.':'Create a podcast show, then upload MP3 episodes directly to Cloudflare R2. Episodes become public only after audio upload verification.'}</p>
      <Link href={`/${locale}/podcasts`} className="inline-block text-sm font-semibold text-[#eab997] hover:underline">{ar?'عرض قسم البودكاست':'View podcast experience'} →</Link>
    </header>
    {ready ? <PodcastPublisher locale={locale} categories={catalog.categories} shows={ownedShows} artists={artistProfiles} /> :
      <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-6 text-sm leading-8 text-amber-100">
        {ar?'قاعدة بيانات البودكاست لسه محتاجة Migration: supabase/migrations/20261116010000_podcast_catalog.sql. التصنيفات ظاهرة للزوار، لكن النشر مش متاح قبل تنفيذها.':'The podcast database migration has not been applied yet. Public categories are visible, but publishing is disabled until supabase/migrations/20261116010000_podcast_catalog.sql is applied.'}
      </div>}
  </div>;
}
