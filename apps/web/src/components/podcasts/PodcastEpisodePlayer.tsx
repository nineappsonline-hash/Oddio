'use client';

import { usePlayer } from '@/lib/player-store';
import { podcastAsTrack } from '@/lib/podcast-playback';
import type { PodcastEpisode, PodcastShow } from '@/lib/podcasts/catalog';
import { OddioPlayIcon } from '@/components/ui/OddioPlayIcon';
import { Pause } from 'lucide-react';

/** Uses the exact same audio engine, mini player, and expanded player as music. */
export function PodcastEpisodePlayer({episode,show,locale}:{
  episode:PodcastEpisode;show:PodcastShow;locale:'en'|'ar';
}) {
  const track=usePlayer(s=>s.track);
  const playing=usePlayer(s=>s.isPlaying);
  const play=usePlayer(s=>s.play);
  const toggle=usePlayer(s=>s.toggle);
  const expand=usePlayer(s=>s.setExpanded);
  const active=track?.id===episode.id&&track.slug==='oddio-podcast-episode';
  const ar=locale==='ar';
  return <section className="rounded-3xl border border-white/10 bg-[#211b28] p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-[#b795d8]">{ar?'استمع على أوديو':'LISTEN ON ODDIO'}</p>
        <p className="mt-2 text-sm text-[#cbbfd4]">{ar?'نفس مشغل الموسيقى بكل أدوات التحكم، وتقدر تكمل الاستماع وأنت بتتصفح.':'Listen in the same music player, and keep listening while you browse.'}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={()=>{if(active){toggle();}else{play(podcastAsTrack(episode,show));}}}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#3e2a50] px-4 text-sm font-bold text-white transition hover:bg-[#52366b]"
          aria-label={active&&playing?(ar?'إيقاف مؤقت':'Pause'):(ar?'تشغيل الحلقة':'Play episode')}>
          {active&&playing?<Pause size={20}/>:<OddioPlayIcon size={38}/>}
          {active&&playing?(ar?'إيقاف مؤقت':'Pause'):(ar?'تشغيل الحلقة':'Play episode')}
        </button>
        {active?<button type="button" onClick={()=>expand(true)} className="min-h-12 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10">{ar?'فتح المشغل':'Open full player'}</button>:null}
      </div>
    </div>
  </section>;
}
