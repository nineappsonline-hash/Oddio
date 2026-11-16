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
  const draftResult=db && ownedShows.length ? await db.from('podcast_episodes')
    .select('id,show_id,title,created_at')
    .in('show_id',ownedShows.map(show=>show.id))
    .eq('status','draft').order('created_at',{ascending:false}).limit(10) : null;
  const drafts=(draftResult?.data??[]).map(d=>({
    id:d.id,title:d.title,showTitle:ownedShows.find(s=>s.id===d.show_id)?.title??'',
  }));
  return <div className="space-y-8 pb-9">
    <header className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c49cef]">{ar?'ODDIO FOR CREATORS':'ODDIO FOR CREATORS'}</p>
      <h1 className="text-3xl font-bold text-white">{ar?'انشر بودكاستك بسهولة':'Make your podcast heard'}</h1>
      <p className="max-w-2xl text-sm leading-6 text-[#a8a0b0]">{ar?'كل اللي محتاجه اسم السلسلة وملف صوت. والباقي علينا.':'Just give your series a name, then upload your audio. We handle the rest.'}</p>
    </header>
    {ready && !artistProfiles.length ? (
      <div className="space-y-3 rounded-2xl border border-[#725797] bg-[#2a1e39] p-6">
        <h2 className="text-lg font-bold text-white">{ar?'أنشئ ملف فنان أولًا':'Create your artist profile first'}</h2>
        <p className="max-w-2xl text-sm leading-7 text-[#d0c1dc]">{ar?'علشان تضيف سلسلة بودكاست، لازم يكون ليك حساب فنان معتمد. أنشئ ملف الفنان أو كمل اعتماده وبعدين ارجع هنا.':'To create podcast series, you need an approved artist profile. Create or complete your artist profile, then return here to publish your series.'}</p>
        <Link href={`/${locale}/studio/artists/new`} className="inline-flex min-h-11 items-center rounded-xl bg-[#76549d] px-5 text-sm font-bold text-white hover:brightness-110">{ar?'إنشاء ملف فنان':'Create artist profile'} →</Link>
      </div>
    ) : null}
    {ready && artistProfiles.length ? <PodcastPublisher locale={locale} categories={catalog.categories} shows={ownedShows} artists={artistProfiles} drafts={drafts} /> :
      <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-6 text-sm leading-8 text-amber-100">
        {ar?'قاعدة بيانات البودكاست لسه محتاجة Migration: supabase/migrations/20261116010000_podcast_catalog.sql. التصنيفات ظاهرة للزوار، لكن النشر مش متاح قبل تنفيذها.':'The podcast database migration has not been applied yet. Public categories are visible, but publishing is disabled until supabase/migrations/20261116010000_podcast_catalog.sql is applied.'}
      </div>}
  </div>;
}
