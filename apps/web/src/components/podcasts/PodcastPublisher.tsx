'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { PodcastCategory, PodcastShow } from '@/lib/podcasts/catalog';

const field = 'w-full min-h-11 rounded-xl border border-white/15 bg-[#36283f] px-3 py-2 text-sm text-white outline-none focus:border-[#e9e9e9]';
const actionButton = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#7c4dff] via-[#a244e8] to-[#d44ed4] px-5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50';

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
  const [mode,setMode]=useState<'series'|'episode'>(shows.length?'episode':'series');
  const [showBusy,setShowBusy]=useState(false),[episodeBusy,setEpisodeBusy]=useState(false);
  const [notice,setNotice]=useState(''),[error,setError]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [localShows,setLocalShows]=useState<PodcastShow[]>(shows);
  const [showTitle,setShowTitle]=useState('');
  const [categoryId,setCategoryId]=useState(categories[0]?.id??'');
  const [language,setLanguage]=useState<'en'|'ar'>(locale),[showDescription,setShowDescription]=useState(''),[coverUrl,setCoverUrl]=useState('');
  const [artistId,setArtistId]=useState(artists[0]?.id??'');
  const [showId,setShowId]=useState(shows[0]?.id??''),[episodeTitle,setEpisodeTitle]=useState(''),[episodeDescription,setEpisodeDescription]=useState('');
  const [episodeNumber,setEpisodeNumber]=useState(''),[seasonNumber,setSeasonNumber]=useState('1');

  // The API still receives its required URL slug; creators never need to understand or type one.
  function slugFor(title:string,kind:'show'|'episode') {
    const clean=title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64);
    return (clean||kind)+'-'+Date.now().toString(36);
  }
  async function createShow(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();setShowBusy(true);setError('');setNotice('');
    try {
      const result=await post({action:'show',artistId,title:showTitle,slug:slugFor(showTitle,'show'),categoryId,language,description:showDescription,coverUrl});
      const created=result.show as PodcastShow|undefined;
      if(created?.id){
        setShowId(created.id);
        setLocalShows(current=>[...current.filter(s=>s.id!==created.id),created]);
      }
      setNotice(ar?'سلسلتك اتعملت! دلوقتي تقدر ترفع أول حلقة.':'Your series is ready! Add your first episode.');
      setShowTitle('');setShowDescription('');setCoverUrl('');setMode('episode');
      router.refresh();
    } catch(err) {setError(err instanceof Error?err.message:String(err));} finally {setShowBusy(false);}
  }

  async function publishEpisode(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();setError('');setNotice('');
    if(!file || !showId){setError(ar?'اختار سلسلة وملف MP3.':'Choose a series and an MP3 file.');return;}
    if(file.size>300*1024*1024 || file.size<1024 || !/\.mp3$/i.test(file.name)){setError(ar?'اختار ملف MP3 أصغر من 300 ميجابايت.':'Choose an MP3 file smaller than 300MB.');return;}
    setEpisodeBusy(true);
    try {
      const durationSeconds=await getAudioDuration(file);
      const result=await post({action:'episode',showId,title:episodeTitle,slug:slugFor(episodeTitle,'episode'),description:episodeDescription,durationSeconds,fileBytes:file.size,
        ...(episodeNumber ? {episodeNumber:Number(episodeNumber)} : {}),seasonNumber:Number(seasonNumber)});
      if(typeof result.uploadUrl!=='string' || typeof result.episodeId!=='string')throw new Error('Upload authorization is missing');
      const uploaded=await fetch(result.uploadUrl,{method:'PUT',headers:{'Content-Type':'audio/mpeg'},body:file});
      if(!uploaded.ok)throw new Error('Audio upload failed. Please try again.');
      await post({action:'publish',episodeId:result.episodeId});
      setNotice(ar?'الحلقة اتنشرت بنجاح!':'Your episode is live!');
      setEpisodeTitle('');setEpisodeDescription('');setEpisodeNumber('');setFile(null);
      const input=document.getElementById('oddio-episode-file') as HTMLInputElement|null;
      if(input)input.value='';
      router.refresh();
    } catch(err) {setError(err instanceof Error?err.message:String(err));} finally {setEpisodeBusy(false);}
  }

  const label='block space-y-2 text-sm font-medium text-[#e5ddeb]';
  const panel='rounded-3xl border border-white/10 bg-[#1b1920] p-5 shadow-[0_24px_70px_rgba(0,0,0,.18)] sm:p-8';
  return <div className="mx-auto max-w-4xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#bda3e1]">{ar?'مساحة المبدعين':'CREATOR SPACE'}</p>
        <h2 className="mt-2 text-2xl font-bold text-white">{ar?'استوديو البودكاست':'Podcast Studio'}</h2>
        <p className="mt-2 text-sm text-[#a8a0b0]">{ar?'أنشئ سلسلتك وارفع حلقاتك في خطوات بسيطة.':'Create your series and publish episodes in a few simple steps.'}</p>
      </div>
      <Link href={ar?'/ar/podcasts/me':'/en/podcasts/me'} className="text-sm font-semibold text-[#d7b7fa] hover:underline">{ar?'عرض ملفي ←':'View my profile →'}</Link>
    </div>

    {notice?<div role="status" className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">{notice}</div>:null}
    {error?<div role="alert" className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>:null}

    <div role="tablist" aria-label={ar?'اختيار المهمة':'Publishing task'} className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#151318] p-1.5">
      <button type="button" role="tab" aria-selected={mode==='series'} onClick={()=>{setMode('series');setError('');}} className={'rounded-xl px-3 py-3 text-sm font-semibold transition '+(mode==='series'?'bg-[#403052] text-white shadow-sm':'text-[#a9a0ae] hover:bg-white/5 hover:text-white')}>
        <span className="me-2 text-[#d2a7ff]">＋</span>{ar?'سلسلة جديدة':'New series'}
      </button>
      <button type="button" role="tab" aria-selected={mode==='episode'} onClick={()=>{setMode('episode');setError('');}} className={'rounded-xl px-3 py-3 text-sm font-semibold transition '+(mode==='episode'?'bg-[#403052] text-white shadow-sm':'text-[#a9a0ae] hover:bg-white/5 hover:text-white')}>
        <span className="me-2 text-[#d2a7ff]">▶</span>{ar?'إضافة حلقة':'Add episode'}
      </button>
    </div>

    {mode==='series'?
      <form id="create-series" onSubmit={createShow} className={panel}>
        <div className="mb-7"><h3 className="text-xl font-bold text-white">{ar?'ابدأ سلسلة جديدة':'Start a new podcast series'}</h3><p className="mt-2 text-sm text-[#a8a0b0]">{ar?'السلسلة بتجمع كل حلقاتك عن موضوع واحد.':'A series brings episodes about one topic together.'}</p></div>
        <div className="space-y-5">
          {artists.length>1?<label className={label}>{ar?'هتنشر باسم مين؟':'Publish as'}<select required className={field} value={artistId} onChange={e=>setArtistId(e.target.value)}>{artists.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>:null}
          {artists.length===1?<p className="text-xs text-[#b6aebe]">{ar?'الناشر: ':'Publishing as: '}{artists[0]?.name}</p>:null}
          <label className={label}>{ar?'اسم السلسلة':'Series name'}<input required minLength={2} maxLength={160} autoComplete="off" placeholder={ar?'مثلاً: فلسفة ببساطة':'e.g. Philosophy Made Simple'} className={field} value={showTitle} onChange={e=>setShowTitle(e.target.value)}/></label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={label}>{ar?'التصنيف':'Category'}<select required className={field} value={categoryId} onChange={e=>setCategoryId(e.target.value)}>{categories.map(c=><option key={c.id} value={c.id}>{ar?c.nameAr:c.nameEn}</option>)}</select></label>
            <label className={label}>{ar?'لغة السلسلة':'Language'}<select className={field} value={language} onChange={e=>setLanguage(e.target.value as 'en'|'ar')}><option value="ar">العربية</option><option value="en">English</option></select></label>
          </div>
          <label className={label}>{ar?'وصف بسيط (اختياري)':'Short description (optional)'}<textarea rows={3} placeholder={ar?'هتتكلم عن إيه في السلسلة؟':'What is your series about?'} className={field} value={showDescription} onChange={e=>setShowDescription(e.target.value)}/></label>
          <details className="rounded-xl border border-white/10 bg-white/[.025] px-4 py-3"><summary className="cursor-pointer text-sm text-[#bda3e1]">{ar?'خيارات إضافية':'More options'}</summary><label className={label+' mt-4'}>{ar?'رابط صورة الغلاف (اختياري)':'Cover image link (optional)'}<input type="url" className={field} value={coverUrl} onChange={e=>setCoverUrl(e.target.value)} placeholder="https://..."/></label></details>
          <button disabled={showBusy||!artistId} className={actionButton+' w-full sm:w-auto'}>{showBusy?(ar?'بننشئ السلسلة...':'Creating series...'):(ar?'إنشاء السلسلة والمتابعة':'Create series & continue')} <span aria-hidden>→</span></button>
        </div>
      </form> :
      <form id="add-episode" onSubmit={publishEpisode} className={panel}>
        <div className="mb-7"><h3 className="text-xl font-bold text-white">{ar?'انشر حلقة جديدة':'Publish a new episode'}</h3><p className="mt-2 text-sm text-[#a8a0b0]">{ar?'اختار السلسلة، ارفع الصوت، واكتب عنوان الحلقة.':'Choose a series, add your audio, and give the episode a title.'}</p></div>
        {localShows.length===0?<div className="rounded-2xl border border-[#674d86] bg-[#33263f] p-6 text-center"><p className="text-sm text-white">{ar?'لسه معندكش سلسلة. اعمل أول سلسلة عشان تنشر حلقاتك.':'You need a series before uploading your first episode.'}</p><button type="button" className="mt-4 rounded-xl bg-[#7c4dbe] px-5 py-2.5 text-sm font-bold text-white" onClick={()=>setMode('series')}>{ar?'إنشاء أول سلسلة':'Create your first series'}</button></div>:
          <div className="space-y-5">
            <label className={label}>{ar?'السلسلة':'Series'}<select required className={field} value={showId} onChange={e=>setShowId(e.target.value)}><option value="">{ar?'اختار السلسلة':'Choose a series'}</option>{localShows.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
            <label className={label}>{ar?'عنوان الحلقة':'Episode title'}<input required minLength={2} placeholder={ar?'مثلاً: يعني إيه فلسفة؟':'e.g. What is philosophy?'} className={field} value={episodeTitle} onChange={e=>setEpisodeTitle(e.target.value)}/></label>
            <label className={label}>{ar?'ملف الحلقة MP3':'Episode audio (MP3)'}<input id="oddio-episode-file" type="file" accept=".mp3,audio/mpeg" required onChange={e=>setFile(e.target.files?.[0]??null)} className="block w-full rounded-2xl border border-dashed border-[#775b92] bg-[#2c2235] p-5 text-sm text-white file:me-3 file:rounded-lg file:border-0 file:bg-[#8557be] file:px-4 file:py-2 file:font-semibold file:text-white"/><span className="block text-xs font-normal text-[#a8a0b0]">{file?file.name:(ar?'اختار ملف MP3 لحد 300 ميجابايت':'Choose an MP3 file up to 300MB')}</span></label>
            <label className={label}>{ar?'وصف الحلقة (اختياري)':'Episode description (optional)'}<textarea rows={3} placeholder={ar?'ملخص صغير للحلقة':'A short summary of this episode'} className={field} value={episodeDescription} onChange={e=>setEpisodeDescription(e.target.value)}/></label>
            <details className="rounded-xl border border-white/10 bg-white/[.025] px-4 py-3"><summary className="cursor-pointer text-sm text-[#bda3e1]">{ar?'ترقيم الحلقات (اختياري)':'Episode numbering (optional)'}</summary><div className="mt-4 grid grid-cols-2 gap-3"><label className={label}>{ar?'الموسم':'Season'}<input type="number" min="1" max="1000" required className={field} value={seasonNumber} onChange={e=>setSeasonNumber(e.target.value)}/></label><label className={label}>{ar?'رقم الحلقة':'Episode #'}<input type="number" min="1" max="100000" className={field} value={episodeNumber} onChange={e=>setEpisodeNumber(e.target.value)}/></label></div></details>
            <button disabled={episodeBusy||!file||!episodeTitle.trim()} className={actionButton+' w-full sm:w-auto'}>{episodeBusy?(ar?'بنرفع الحلقة وننشرها...':'Uploading & publishing...'):(ar?'نشر الحلقة':'Publish episode')} <span aria-hidden>→</span></button>
            <p className="text-xs text-[#968e9d]">{ar?'ملف الصوت بيتحفظ بأمان على Cloudflare R2.':'Your audio is stored on Cloudflare R2.'}</p>
          </div>}
      </form>}
    {localShows.length>0?<section className="space-y-3 pt-2"><div className="flex items-center justify-between"><h3 className="text-base font-bold text-white">{ar?'سلاسلي':'My series'}</h3><span className="text-xs text-[#a8a0b0]">{localShows.length}</span></div><div className="grid gap-3 sm:grid-cols-2">{localShows.map(s=><Link key={s.id} href={'/'+locale+'/podcasts/shows/'+s.slug} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#211d27] p-4 transition hover:border-[#835bab]"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{s.title}</p><p className="mt-1 text-xs text-[#a8a0b0]">{ar?'عرض الحلقات':'View episodes'}</p></div><span className="text-[#c39def]">↗</span></Link>)}</div></section>:null}
  </div>;
}
