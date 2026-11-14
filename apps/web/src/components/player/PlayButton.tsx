'use client';

import { Pause, Play } from 'lucide-react';
import type { CatalogTrack } from '@/lib/data/queries';
import { usePlayer } from '@/lib/player-store';
import { useT } from '@/i18n/use-translator';
import { cn } from '@/lib/utils';

export function PlayButton({
  track,
  queue = [],
  size = 'md',
  className,
  showLabel = false,
}: {
  track: CatalogTrack;
  queue?: CatalogTrack[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}) {
  const t = useT();
  const current = usePlayer((state) => state.track?.id === track.id);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const play = usePlayer((state) => state.play);
  const toggle = usePlayer((state) => state.toggle);
  const active = current && isPlaying;

  const sizes = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-20 w-20',
  } as const;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (current) toggle();
        else play(track, queue);
      }}
      aria-label={active ? t('common.pause') : t('common.play')}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-primary text-white shadow-glow transition hover:scale-105 hover:bg-primary-strong',
        sizes[size],
        className,
      )}
    >
      {active ? (
        <Pause className="h-5 w-5" fill="currentColor" />
      ) : (
        <Play className="ms-0.5 h-5 w-5" fill="currentColor" />
      )}
      {showLabel ? <span className="sr-only">{t('common.play')}</span> : null}
    </button>
  );
}
