'use client';

import Link from 'next/link';
import { ListPlus, Pause, Play } from 'lucide-react';
import type { CatalogTrack } from '@/lib/data/queries';
import { usePlayer } from '@/lib/player-store';
import { useT } from '@/i18n/use-translator';
import { Artwork } from '@/components/ui/Artwork';
import { LikeButton } from '@/components/community/LikeButton';
import { useToast } from '@/components/providers/ToastProvider';
import { Equalizer } from '@/components/visuals/Equalizer';
import { cn, formatDuration, formatNumber } from '@/lib/utils';
import type { Locale } from '@ai-music/contracts';

export function TrackRow({
  track,
  queue,
  index,
  locale,
  showArtist = true,
  rank,
}: {
  track: CatalogTrack;
  queue?: CatalogTrack[];
  index?: number;
  locale: Locale;
  showArtist?: boolean;
  rank?: number;
}) {
  const t = useT();
  const { toast } = useToast();
  const play = usePlayer((state) => state.play);
  const toggle = usePlayer((state) => state.toggle);
  const addToQueue = usePlayer((state) => state.addToQueue);
  const isCurrent = usePlayer((state) => state.track?.id === track.id);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const active = isCurrent && isPlaying;

  function onPlay() {
    if (isCurrent) toggle();
    else play(track, queue ?? []);
  }

  return (
    <div
      className={cn(
        'group relative grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-xl px-2 py-2 transition duration-300 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto]',
        isCurrent
          ? 'bg-[linear-gradient(90deg,rgba(157,92,255,0.16),rgba(65,217,255,0.04))] shadow-[inset_0_0_0_1px_rgba(157,92,255,0.2)]'
          : 'hover:bg-white/[0.05]',
      )}
    >
      {rank !== undefined ? (
        <span className="w-5 bg-gradient-to-b from-ink to-primary/70 bg-clip-text text-center text-xs font-black tabular-nums text-transparent">
          {rank}
        </span>
      ) : (
        <span className="hidden w-4 text-center text-xs tabular-nums text-muted sm:block">
          {index !== undefined ? index + 1 : ''}
        </span>
      )}
      <button
        type="button"
        onClick={onPlay}
        aria-label={active ? t('common.pause') : t('common.play')}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
      >
        <Artwork
          title={track.title}
          url={track.artwork.url}
          accent={track.artwork.accent}
          className="h-11 w-11"
          rounded="rounded-lg"
        />
        <span
          className={cn(
            'absolute inset-0 z-10 m-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition',
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          {active ? (
            <Pause className="h-4 w-4" fill="currentColor" />
          ) : (
            <Play className="ms-0.5 h-4 w-4" fill="currentColor" />
          )}
        </span>
        {isCurrent ? (
          <span className="absolute -bottom-1 -end-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-primary shadow-glow">
            <Equalizer bars={3} paused={!isPlaying} className="h-2 text-white" />
          </span>
        ) : null}
      </button>
      <div className="min-w-0">
        <span className="flex items-center gap-1.5">
          <Link
            href={`/${locale}/tracks/${track.id}-${track.slug}`}
            className={cn(
              'block truncate text-sm font-semibold transition hover:underline',
              isCurrent ? 'text-primary' : 'text-ink group-hover:text-ink',
            )}
          >
            {track.title}
          </Link>
          {isCurrent ? (
            <Equalizer
              bars={4}
              paused={!isPlaying}
              className="h-3 shrink-0 text-primary"
            />
          ) : null}
        </span>
        {showArtist && track.artist ? (
          <Link
            href={`/${locale}/artists/${track.artist.slug}`}
            className="block truncate text-xs text-muted transition hover:text-ink"
          >
            {track.artist.name}
          </Link>
        ) : null}
      </div>
      <span className="hidden text-xs text-muted sm:block">
        {formatNumber(track.qualifiedPlays, locale)} {t('common.plays')}
      </span>
      <div className="flex items-center gap-1">
        <LikeButton
          trackId={track.id}
          initialLiked={track.isLiked}
          initialCount={track.likeCount}
          compact
          className="hidden sm:inline-flex"
        />
        <button
          type="button"
          onClick={() => {
            addToQueue(track);
            toast(t('player.addToQueue'), 'success');
          }}
          aria-label={t('player.addToQueue')}
          className="hidden rounded-full p-2 text-muted opacity-0 transition hover:bg-white/10 hover:text-ink group-hover:opacity-100 sm:block"
        >
          <ListPlus className="h-4 w-4" />
        </button>
        <span className="w-10 text-end text-xs tabular-nums text-muted">
          {formatDuration(track.durationMs)}
        </span>
      </div>
    </div>
  );
}
