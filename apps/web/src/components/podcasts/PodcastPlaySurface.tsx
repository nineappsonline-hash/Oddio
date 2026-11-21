'use client';

import type { ReactNode } from 'react';
import { Pause, AudioLines } from 'lucide-react';
import { usePlayer } from '@/lib/player-store';
import { podcastAsTrack } from '@/lib/podcast-playback';
import type { PodcastEpisode, PodcastShow } from '@/lib/podcasts/catalog';

/** A single accessible click target for the whole episode card/row. */
export function PodcastPlaySurface({
  episode,
  show,
  upcoming = [],
  className,
  children,
  locale,
}: {
  episode: PodcastEpisode;
  show: PodcastShow;
  upcoming?: PodcastEpisode[];
  className: string;
  children: ReactNode;
  locale: 'en' | 'ar';
}) {
  const current = usePlayer((s) => s.track);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const play = usePlayer((s) => s.play);
  const toggle = usePlayer((s) => s.toggle);
  const active = current?.id === episode.id && current.slug === 'oddio-podcast-episode';
  const label =
    active && isPlaying
      ? locale === 'ar'
        ? 'إيقاف الحلقة مؤقتًا'
        : 'Pause episode'
      : locale === 'ar'
        ? `تشغيل الحلقة: ${episode.title}`
        : `Play episode: ${episode.title}`;

  return (
    <button
      type="button"
      onClick={() =>
        active
          ? toggle()
          : play(
              podcastAsTrack(episode, show),
              upcoming.map((item) => podcastAsTrack(item, show)),
            )
      }
      className={
        className +
        ' relative w-full text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b88be5]' +
        (active
          ? ' !border-[#bd73f0] !bg-[#a953e7]/[0.12] ring-2 ring-[#ab60e2]/60 shadow-[0_0_0_1px_rgba(188,115,240,0.2),0_15px_38px_rgba(119,57,174,0.24)]'
          : '')
      }
      aria-label={label}
      aria-pressed={active && isPlaying}
    >
      {children}
      {active ? (
        <span
          aria-live="polite"
          className="pointer-events-none absolute start-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-[#c78bf4]/70 bg-[#22142d]/95 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg backdrop-blur-md"
        >
          {isPlaying ? <AudioLines className="h-3.5 w-3.5 animate-pulse text-[#dfb3fa]" /> : <Pause className="h-3.5 w-3.5 text-[#dfb3fa]" />}
          {isPlaying ? (locale === 'ar' ? 'شغّال دلوقتي' : 'Now playing') : (locale === 'ar' ? 'متوقف مؤقتًا' : 'Paused')}
        </span>
      ) : null}
    </button>
  );
}
