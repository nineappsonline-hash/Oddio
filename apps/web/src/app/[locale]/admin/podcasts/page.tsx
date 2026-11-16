import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/session';
import { serviceClient } from '@/lib/data/supabase-store';
import { isLocale } from '@/i18n/config';
import { PodcastReviewActions } from '@/components/admin/PodcastReviewActions';
export const dynamic='force-dynamic';
export default async function PodcastReviewQueue({params}:{params:Promise<{locale:string}>}) {
  const {locale:raw}=await params;
  if(!isLocale(raw))redirect('/en');
  const locale=raw,ar=locale==='ar';
  const user=await getSessionUser();
  if(!user)redirect('/'+locale+'/login');
  if(!user.roles.some(r=>r==='admin'||r==='super_admin'))redirect('/'+locale);
  const db=serviceClient();
  const {data:episodes,error}=await db.from('podcast_episodes')
    .select('id,title,description,show_id,duration_seconds,created_at,audio_bytes')
    .eq('status','pending_review').order('created_at',{ascending:true}).limit(100);
  const showIds=[...new Set((episodes??[]).map(e=>e.show_id))];
  const {data:shows}=showIds.length?await db.from('podcast_shows').select('id,title,author_name').in('id',showIds):{data:[]};
  const showMap=new Map((shows??[]).map(s=>[s.id,s]));
  return <div className="mx-auto max-w-5xl space-y-6 pb-12">
    <header className="space-y-2">
      <Link href={`/${locale}/admin/review`} className="text-xs text-[#bca0e7] hover:underline">{ar?'← مراجعة الأغاني':'← Track review'}</Link>
      <h1 className="text-3xl font-bold text-white">{ar?'مراجعة حلقات البودكاست':'Podcast episode review'}</h1>
      <p className="text-sm text-[#aaa]">{ar?'استمع لكل حلقة، ثم وافق عليها أو ارفضها مع توضيح السبب.':'Listen to each episode, then approve or reject it with a reason.'}</p>
      <p className="text-xs text-[#bda3e1]">{episodes?.length??0} {ar?'حلقات بانتظار الموافقة':'episodes awaiting approval'}</p>
    </header>
    {error?<p role="alert" className="rounded-xl bg-red-950/40 p-4 text-red-200">{ar?'تعذر تحميل قائمة المراجعة':'Unable to load review queue'}</p>:null}
    {!error&&episodes?.length===0?<p className="rounded-2xl border border-white/10 bg-[#211c29] p-8 text-sm text-[#aaa]">{ar?'لا توجد حلقات تحتاج مراجعة حاليًا.':'No podcast episodes are waiting for review.'}</p>:null}
    <div className="space-y-4">
      {(episodes??[]).map(e=><article key={e.id} className="rounded-2xl border border-white/10 bg-[#201b27] p-5">
        <p className="text-xs text-[#bda3e1]">{showMap.get(e.show_id)?.title??''} · {showMap.get(e.show_id)?.author_name??''}</p>
        <h2 className="mt-2 text-lg font-bold text-white">{e.title}</h2>
        <p className="mt-2 text-sm text-[#bbb]">{e.description}</p>
        <p className="mt-2 text-xs text-[#999]">{new Date(e.created_at).toLocaleString(locale)} · {Math.ceil(e.duration_seconds/60)} min · {e.audio_bytes?Math.round(e.audio_bytes/1048576):'?'} MB</p>
        <audio controls preload="none" className="mt-4 w-full" src={`/api/admin/podcasts/preview?id=${e.id}`}/>
        <PodcastReviewActions episodeId={e.id} locale={locale}/>
      </article>)}
    </div>
  </div>;
}