'use client';

import type { ReactNode } from 'react';
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
        ' w-full text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b88be5]'
      }
      aria-label={label}
      aria-pressed={active && isPlaying}
    >
      {children}
    </button>
  );
}
