'use client';

import Link from 'next/link';
import type { CatalogTrack } from '@/lib/data/queries';
import { Artwork } from '@/components/ui/Artwork';
import { PlayButton } from '@/components/player/PlayButton';
import { Badge } from '@/components/ui/Badge';
import { Equalizer } from '@/components/visuals/Equalizer';
import { usePlayer } from '@/lib/player-store';
import { useLocale, useT } from '@/i18n/use-translator';

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
  const isPlaying = usePlayer((state) => state.isPlaying);

  return (
    <article className="group card card-hover relative overflow-hidden p-3">
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
          <span className="glass-pill absolute start-2 bottom-2 inline-flex items-center gap-1.5 rounded-pill px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-ink">
            <Equalizer bars={3} paused={!isPlaying} className="h-2.5 text-primary" />
            {isPlaying ? t('player.live') : t('player.paused')}
          </span>
        ) : null}
        <div className="absolute bottom-2 end-2 translate-y-2 opacity-100 transition duration-300 group-hover:translate-y-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <PlayButton
            track={track}
            queue={queue}
            size="md"
            className="shadow-glow-lg ring-2 ring-white/15"
          />
        </div>
      </div>
      <div className="mt-3 space-y-0.5 px-0.5">
        <Link
          href={`/${locale}/tracks/${track.id}-${track.slug}`}
          className="block truncate text-sm font-semibold text-ink transition group-hover:text-primary"
        >
          {track.title}
        </Link>
        {track.artist ? (
          <Link
            href={`/${locale}/artists/${track.artist.slug}`}
            className="block truncate text-xs text-muted transition hover:text-ink"
          >
            {track.artist.name}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
