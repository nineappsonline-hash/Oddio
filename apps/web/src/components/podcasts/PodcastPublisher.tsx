'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { PodcastCategory, PodcastShow } from '@/lib/podcasts/catalog';

const field = 'w-full min-h-11 rounded-xl border border-white/15 bg-[#36283f] px-3 py-2 text-sm text-white outline-none focus:border-[#e9e9e9]';
const actionButton = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-[#e9e9e9] px-5 text-sm font-bold text-[#100d13] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50';

async function post(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch('/api/podcasts/manage', {
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
  });
  const payload = (await response.json().catch(()=>({error:'Unexpected response'}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof payload.error==='string'?payload.error:'Unable to save podcast data');
  return payload;
}

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve,reject) => {
    const audio = document.createElement('audio'),url=URL.createObjectURL(file);
    const cleanup=()=>{clearTimeout(timer);audio.removeAttribute('src');URL.revokeObjectURL(url);};
    const timer=setTimeout(()=>{cleanup();reject(new Error('Could not read the MP3 duration'));},12000);
    audio.preload='metadata';audio.onloadedmetadata=()=>{
      const duration=audio.duration;cleanup();
      if(!Number.isFinite(duration) || duration<1) reject(new Error('Invalid audio duration'));
      else resolve(Math.ceil(duration));
    };
    audio.onerror=()=>{cleanup();reject(new Error('Unsupported or damaged MP3 file'));};
    audio.src=url;
  });
}

export function PodcastPublisher({locale,categories,shows,artists}:{
  locale:'en'|'ar';categories:PodcastCategory[];shows:PodcastShow[];
  artists:Array<{id:string;name:string}>;
}) {
  const router=useRouter(),ar=locale==='ar';
  const [showBusy,setShowBusy]=useState(false),[episodeBusy,setEpisodeBusy]=useState(false);
  const [notice,setNotice]=useState(''),[error,setError]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [showTitle,setShowTitle]=useState(''),[showSlug,setShowSlug]=useState('');
  const [categoryId,setCategoryId]=useState(categories[0]?.id??'');
  const [language,setLanguage]=useState<'en'|'ar'>('en'),[showDescription,setShowDescription]=useState(''),[coverUrl,setCoverUrl]=useState('');
  const [artistId,setArtistId]=useState(artists[0]?.id??'');
  const [showId,setShowId]=useState(shows[0]?.id??''),[episodeTitle,setEpisodeTitle]=useState(''),[episodeSlug,setEpisodeSlug]=useState(''),[episodeDescription,setEpisodeDescription]=useState('');
  const [episodeNumber,setEpisodeNumber]=useState(''),[seasonNumber,setSeasonNumber]=useState('1');

  async function createShow(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();setShowBusy(true);setError('');setNotice('');
    try {
      await post({action:'show',artistId,title:showTitle,slug:showSlug,categoryId,language,description:showDescription,coverUrl});
      setNotice(ar?'تم إنشاء البرنامج. تقدر تضيف الحلقات دلوقتي.':'Show published. You can now add episodes.');
      setShowTitle('');setShowSlug('');setShowDescription('');setCoverUrl('');
      router.refresh();
    } catch(err) {setError(err instanceof Error?err.message:String(err));} finally {setShowBusy(false);}
  }

  async function publishEpisode(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();setError('');setNotice('');
    if(!file || !showId){setError(ar?'اختار برنامج وملف MP3.':'Select a show and an MP3 file.');return;}
    if(file.size>300*1024*1024 || file.size<1024 || !/\.mp3$/i.test(file.name)){setError(ar?'مطلوب ملف MP3 أقل من 300 ميجابايت.':'Choose an MP3 file smaller than 300MB.');return;}
    setEpisodeBusy(true);
    try {
      const durationSeconds=await getAudioDuration(file);
      const result=await post({action:'episode',showId,title:episodeTitle,slug:episodeSlug,description:episodeDescription,durationSeconds,fileBytes:file.size,
        ...(episodeNumber ? {episodeNumber:Number(episodeNumber)} : {}),seasonNumber:Number(seasonNumber)});
      if(typeof result.uploadUrl!=='string' || typeof result.episodeId!=='string')throw new Error('Upload authorization is missing');
      const uploaded=await fetch(result.uploadUrl,{method:'PUT',headers:{'Content-Type':'audio/mpeg'},body:file});
      if(!uploaded.ok)throw new Error(`Cloudflare upload failed (HTTP ${uploaded.status}). Check R2 bucket CORS settings.`);
      await post({action:'publish',episodeId:result.episodeId});
      setNotice(ar?'تم رفع الحلقة ونشرها بنجاح.':'Episode uploaded and published successfully.');
      setEpisodeTitle('');setEpisodeSlug('');setEpisodeDescription('');setEpisodeNumber('');setFile(null);
      router.refresh();
    } catch(err) {setError(err instanceof Error?err.message:String(err));} finally {setEpisodeBusy(false);}
  }

  return <div className="space-y-5">
    {notice?<div role="status" className="rounded-xl border border-green-400/30 bg-green-900/20 p-4 text-sm text-green-100">{notice}</div>:null}
    {error?<div role="alert" className="rounded-xl border border-red-400/30 bg-red-900/20 p-4 text-sm text-red-200">{error}</div>:null}
    {shows.length > 0 ? <section className="space-y-3" aria-label={ar?'سلاسل البودكاست الخاصة بك':'Your podcast series'}>
      <h2 className="text-xl font-bold text-white">{ar?'سلاسلي الحالية':'My podcast series'}</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shows.map(show=><Link key={show.id} href={`/${locale}/podcasts/shows/${show.slug}`} className="rounded-2xl border border-white/10 bg-[#202020] p-4 transition hover:border-[#e9e9e9]/70">
          <span className="text-xs font-bold uppercase tracking-wide text-[#e9e9e9]">{ar?'سلسلة بودكاست':'PODCAST SERIES'}</span>
          <h3 className="mt-2 line-clamp-2 font-bold text-white">{show.title}</h3>
          <p className="mt-1 truncate text-xs text-[#a3a3a3]">{show.author}</p>
          <p className="mt-2 text-xs font-semibold text-[#e9e9e9]">{ar?'عرض الحلقات ←':'View episodes →'}</p>
        </Link>)}
      </div>
    </section> : null}
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <form onSubmit={createShow} className="space-y-4 rounded-2xl border border-white/10 bg-[#202020] p-5">
        <h2 className="text-xl font-bold text-white">{ar?'أنشئ سلسلة بودكاست':'Create a podcast series'}</h2>
        <p className="text-sm leading-6 text-[#a3a3a3]">{ar?'كل سلسلة لها اسم وموضوع، وتقدر تضيف لها حلقات مختلفة بترتيب واضح.':'Give one topic its own series, then publish related episodes in order.'}</p>
        <label className="block space-y-1 text-xs text-[#d8cbdc]">{ar?'حساب الفنان':'Artist profile'}<select required className={field} value={artistId} onChange={e=>setArtistId(e.target.value)}><option value="">{ar?'اختار الفنان':'Choose an artist'}</option>{artists.map(artist=><option key={artist.id} value={artist.id}>{artist.name}</option>)}</select></label>
        <label className="block space-y-1 text-xs text-[#d8cbdc]">{ar?'اسم البرنامج':'Show title'}<input required minLength={2} maxLength={160} className={field} value={showTitle} onChange={e=>setShowTitle(e.target.value)}/></label>
        <label className="block space-y-1 text-xs text-[#d8cbdc]">{ar?'رابط البرنامج (حروف إنجليزية وأرقام وشرطات)':'Show slug (lowercase letters and dashes)'}<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={field} value={showSlug} onChange={e=>setShowSlug(e.target.value)}/></label>
        
        <label className="block space-y-1 text-xs text-[#d8cbdc]">{ar?'التصنيف':'Category'}<select required className={field} value={categoryId} onChange={e=>setCategoryId(e.target.value)}>{categories.map(c=><option key={c.id} value={c.id}>{ar?c.nameAr:c.nameEn}</option>)}</select></label>
        <label className="block space-y-1 text-xs text-[#d8cbdc]">{ar?'اللغة':'Language'}<select className={field} value={language} onChange={e=>setLanguage(e.target.value as 'en'|'ar')}><option value="en">English</option><option value="ar">العربية</option></select></label>
        <label className="block space-y-1 text-xs text-[#d8cbdc]">{ar?'وصف البرنامج':'Show description'}<textarea rows={4} className={field} value={showDescription} onChange={e=>setShowDescription(e.target.value)}/></label>
        <label className="block space-y-1 text-xs text-[#d8cbdc]">{ar?'رابط صورة البرنامج (اختياري)':'Cover image URL (optional)'}<input type="url" className={field} value={coverUrl} onChange={e=>setCoverUrl(e.target.value)} placeholder="https://..."/></label>
        <button disabled={showBusy||!artistId} className={actionButton}>{showBusy?(ar?'جارٍ الحفظ...':'Saving...'):(ar?'أنشئ السلسلة':'Create series')}</button>
      </form>
      <form onSubmit={publishEpisode} className="space-y-4 rounded-2xl border border-white/10 bg-[#202020] p-5">
        <h2 className="text-xl font-bold text-white">{ar?'أضف حلقة إلى سلسلة':'Add an episode to a series'}</h2>
        <label className="block space-y-1 text-xs text-[#d8cbdc]">{ar?'اختار السلسلة':'Podcast series'}<select required className={field} value={showId} onChange={e=>setShowId(e.target.value)}><option value="">{ar?'اختار السلسلة':'Choose a series'}</option>{shows.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
        <label className="block space-y-1 text-xs text-[#d8cbdc]">{ar?'عنوان الحلقة':'Episode title'}<input required minLength={2} className={field} value={episodeTitle} onChange={e=>setEpisodeTitle(e.target.value)}/></label>
        <label className="block space-y-1 text-xs text-[#d8cbdc]">{ar?'رابط الحلقة':'Episode slug'}<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={field} value={episodeSlug} onChange={e=>setEpisodeSlug(e.target.value)}/></label>
        <div className="grid grid-cols-2 gap-3"><label className="block space-y-1 text-xs text-[#d8cbdc]">{ar?'رقم الموسم':'Season number'}<input type="number" min="1" max="1000" required className={field} value={seasonNumber} onChange={e=>setSeasonNumber(e.target.value)}/></label><label className="block space-y-1 text-xs text-[#d8cbdc]">{ar?'رقم الحلقة (اختياري)':'Episode number (optional)'}<input type="number" min="1" max="100000" className={field} value={episodeNumber} onChange={e=>setEpisodeNumber(e.target.value)}/></label></div>
        <label className="block space-y-1 text-xs text-[#d8cbdc]">{ar?'وصف الحلقة':'Episode description'}<textarea rows={4} className={field} value={episodeDescription} onChange={e=>setEpisodeDescription(e.target.value)}/></label>
        <label className="block space-y-2 text-xs text-[#d8cbdc]">{ar?'ملف صوت MP3 بحد أقصى 300 ميجابايت':'Audio MP3 file (max 300MB)'}<input type="file" accept=".mp3,audio/mpeg" required onChange={e=>setFile(e.target.files?.[0]??null)} className="block w-full rounded-xl border border-dashed border-white/20 bg-[#36283f] p-5 text-sm text-white file:me-3 file:rounded-lg file:border-0 file:bg-[#e9e9e9] file:px-4 file:py-2 file:font-bold file:text-[#100d13]"/></label>
        <p className="text-xs leading-6 text-[#a3a3a3]">{ar?'الملف بيروح مباشرة إلى Cloudflare R2، وبيتم التأكد من رفعه قبل نشر الحلقة.':'Audio uploads directly to Cloudflare R2. Publishing is completed only after the file is verified.'}</p>
        <button disabled={episodeBusy||!shows.length} className={actionButton}>{episodeBusy?(ar?'جارٍ الرفع والتحقق...':'Uploading and verifying...'):(ar?'ارفع وانشر الحلقة':'Upload & publish episode')}</button>
        {!shows.length?<p className="text-xs text-[#e9e9e9]">{ar?'أنشئ سلسلة الأول علشان ترفع حلقاتها.':'Create a series first to upload an episode.'}</p>:null}
      </form>
    </div>
  </div>;
}
