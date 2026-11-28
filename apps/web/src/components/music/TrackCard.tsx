'use client';

import Link from 'next/link';
import type { CatalogTrack } from '@/lib/data/queries';
import { Artwork } from '@/components/ui/Artwork';
import { AutoScrollTitle } from '@/components/ui/AutoScrollTitle';
import { PlayButton } from '@/components/player/PlayButton';
import { Badge } from '@/components/ui/Badge';
import { Equalizer } from '@/components/visuals/Equalizer';
import { usePlayer } from '@/lib/player-store';
import { useLocale, useT } from '@/i18n/use-translator';
import { cn } from '@/lib/utils';

export function TrackCard({
  track,
  queue,
}: {
  track: CatalogTrack;
  queue?: CatalogTrack[];
}) {
  const t = useT();
  const locale = useLocale();
  const isCurrent = usePlayer((state) => state.track?.id === track.id);
  // Only the currently selected card needs play/pause updates.
  // Other cards should not re-render every time player state changes.
  const isPlaying = usePlayer((state) => state.track?.id === track.id && state.isPlaying);

  return (
    <article
      data-playback-state={isCurrent ? (isPlaying ? 'playing' : 'paused') : undefined}
      className={cn(
        'group card card-hover relative min-w-0 overflow-hidden p-3 transition-colors duration-200 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20',
        isCurrent &&
          'border-[#bd73f0] bg-[#a953e7]/[0.12] ring-2 ring-[#ab60e2]/50 shadow-[0_12px_36px_rgba(119,57,174,0.2)]',
      )}
    >
      <div className="art-frame relative rounded-xl">
        <Artwork
          title={track.title}
          url={track.artwork.url}
          accent={track.artwork.accent}
          className="aspect-square w-full transition duration-700 ease-out group-hover:scale-[1.045]"
          rounded="rounded-xl"
        />
        <span className="art-sheen" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-black/0 opacity-70" />
        {track.productionType === 'fully_ai' ? (
          <Badge
            tone="primary"
            className="ai-shimmer absolute start-2 top-2 border-white/20 bg-black/40 text-white backdrop-blur"
          >
            AI
          </Badge>
        ) : null}
        {isCurrent ? (
          <span className="glass-pill absolute start-2 top-2 z-20 inline-flex items-center gap-1.5 rounded-full border border-[#c78bf4]/70 bg-[#22142d]/95 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-lg backdrop-blur-md">
            <Equalizer bars={3} paused={!isPlaying} className="h-2.5 text-primary" />
            {isPlaying ? t('player.live') : t('player.paused')}
          </span>
        ) : null}
        <div className="absolute bottom-2 end-2 sm:translate-y-2 opacity-100 transition duration-300 group-hover:translate-y-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <PlayButton
            track={track}
            queue={queue}
            size="md"
            className="oddio-card-play shadow-glow-lg ring-2 ring-white/15"
          />
        </div>
      </div>
      <div className="mt-3 space-y-0.5 px-0.5">
        <Link
          prefetch={false}
          href={`/${locale}/tracks/${track.id}-${track.slug}`}
          className="block min-w-0 rounded-sm text-sm font-semibold text-ink transition group-hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <AutoScrollTitle text={track.title} lines={1} />
        </Link>
        {track.artist ? (
          <Link
            prefetch={false}
            href={`/${locale}/artists/${track.artist.slug}`}
            className="block truncate rounded-sm text-xs text-muted transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {track.artist.name}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
