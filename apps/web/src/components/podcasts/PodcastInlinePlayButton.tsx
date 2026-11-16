'use client';
import { usePlayer } from '@/lib/player-store';
import { podcastAsTrack } from '@/lib/podcast-playback';
import { OddioPlayIcon } from '@/components/ui/OddioPlayIcon';
import { Pause } from 'lucide-react';
import type { PodcastEpisode,PodcastShow } from '@/lib/podcasts/catalog';

export function PodcastInlinePlayButton({episode,show,locale,upcoming=[]}:{
  episode:PodcastEpisode;show:PodcastShow;locale:'en'|'ar';upcoming?:PodcastEpisode[];
}) {
  const track=usePlayer(s=>s.track);
  const playing=usePlayer(s=>s.isPlaying);
  const play=usePlayer(s=>s.play);
  const toggle=usePlayer(s=>s.toggle);
  const active=track?.id===episode.id && track.slug==='oddio-podcast-episode';
  return <button
    type="button"
    onClick={()=>active?toggle():play(podcastAsTrack(episode,show),upcoming.map(item=>podcastAsTrack(item,show)))}
    aria-label={active&&playing?(locale==='ar'?'إيقاف مؤقت':'Pause episode'):(locale==='ar'?'تشغيل الحلقة':'Play episode')}
    title={active&&playing?(locale==='ar'?'إيقاف مؤقت':'Pause episode'):(locale==='ar'?'تشغيل الحلقة':'Play episode')}
    className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#32253e] transition-all hover:bg-[#483159] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c49bea]"
  >
    {active&&playing?<Pause size={21} fill="currentColor" className="text-white"/>:<OddioPlayIcon size={38}/>}
  </button>;
}
