'use client';

import Link from 'next/link';
import {
  ListMusic,
  Maximize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { usePlayer } from '@/lib/player-store';
import { useLocale, useT } from '@/i18n/use-translator';
import { Artwork } from '@/components/ui/Artwork';
import { Equalizer } from '@/components/visuals/Equalizer';
import { cn, formatDuration } from '@/lib/utils';

export function PlayerBar() {
  const t = useT();
  const rtl = useLocale() === 'ar';
  const track = usePlayer((state) => state.track);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const currentTime = usePlayer((state) => state.currentTime);
  const duration = usePlayer((state) => state.duration);
  const volume = usePlayer((state) => state.volume);
  const muted = usePlayer((state) => state.muted);
  const repeat = usePlayer((state) => state.repeat);
  const shuffle = usePlayer((state) => state.shuffle);
  const queueLength = usePlayer((state) => state.queue.length);
  const buffering = usePlayer((state) => state.buffering);
  const error = usePlayer((state) => state.error);
  const toggle = usePlayer((state) => state.toggle);
  const next = usePlayer((state) => state.next);
  const previous = usePlayer((state) => state.previous);
  const seek = usePlayer((state) => state.seek);
  const setVolume = usePlayer((state) => state.setVolume);
  const toggleMute = usePlayer((state) => state.toggleMute);
  const cycleRepeat = usePlayer((state) => state.cycleRepeat);
  const toggleShuffle = usePlayer((state) => state.toggleShuffle);
  const setExpanded = usePlayer((state) => state.setExpanded);

  if (!track) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed inset-x-0 bottom-16 z-40 overflow-hidden border-t border-white/10 bg-[#0d0d1a]/88 px-3 py-2.5 shadow-[0_-20px_60px_-30px_rgba(157,92,255,0.65)] backdrop-blur-2xl lg:bottom-0 lg:start-64 lg:end-0 lg:px-6"
      role="region"
      aria-label={t('player.miniPlayer')}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 start-1/4 h-40 w-80 opacity-30 blur-3xl"
        style={{
          background: `radial-gradient(circle, ${track.artwork.accent}, transparent 70%)`,
        }}
      />
      {error ? (
        <p
          className="mb-2 rounded-lg bg-danger/15 px-3 py-1.5 text-xs text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="group/art relative shrink-0"
          aria-label={t('player.expand')}
        >
          {isPlaying ? (
            <span className="absolute -inset-1 animate-pulse-ring rounded-xl border border-primary/50" />
          ) : null}
          <Artwork
            title={track.title}
            url={track.artwork.url}
            accent={track.artwork.accent}
            className="h-12 w-12 transition duration-500 group-hover/art:scale-105"
            rounded="rounded-lg"
          />
        </button>
        <div className="min-w-0 flex-1 lg:flex-none lg:basis-56">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/tracks/${track.id}-${track.slug}`}
              className="block truncate text-sm font-semibold text-ink hover:underline"
            >
              {track.title}
            </Link>
            <Equalizer
              bars={3}
              paused={!isPlaying}
              className="h-3 shrink-0 text-primary"
            />
          </div>
          {track.artist ? (
            <Link
              href={`/artists/${track.artist.slug}`}
              className="block truncate text-xs text-muted hover:text-ink"
            >
              {track.artist.name}
            </Link>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleShuffle}
              aria-label={t('player.shuffle')}
              aria-pressed={shuffle}
              className={cn(
                'hidden rounded-full p-2 transition hover:bg-white/10 sm:block',
                shuffle ? 'text-primary' : 'text-muted',
              )}
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={previous}
              aria-label={t('common.previous')}
              className="rounded-full p-2 text-muted transition hover:bg-white/10 hover:text-ink"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label={isPlaying ? t('common.pause') : t('common.play')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-strong"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" fill="currentColor" />
              ) : (
                <Play className="ms-0.5 h-5 w-5" fill="currentColor" />
              )}
            </button>
            <button
              type="button"
              onClick={() => next()}
              aria-label={t('common.next')}
              className="rounded-full p-2 text-muted transition hover:bg-white/10 hover:text-ink"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={cycleRepeat}
              aria-label={t('player.repeat')}
              className={cn(
                'hidden rounded-full p-2 transition hover:bg-white/10 sm:block',
                repeat !== 'off' ? 'text-primary' : 'text-muted',
              )}
            >
              {repeat === 'one' ? (
                <Repeat1 className="h-4 w-4" />
              ) : (
                <Repeat className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="hidden w-full max-w-xl items-center gap-2 sm:flex">
            <span className="w-10 text-end text-[10px] tabular-nums text-muted">
              {formatDuration(currentTime * 1000)}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(duration, 0.1)}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => seek(Number(event.target.value))}
              className="h-1 flex-1 shadow-[0_0_14px_rgba(157,92,255,0.45)]"
              aria-label={t('player.seek')}
              style={{
                background: `linear-gradient(to ${rtl ? 'left' : 'right'}, #9D5CFF ${progress}%, rgba(255,255,255,0.18) ${progress}%)`,
              }}
            />
            <span className="w-10 text-[10px] tabular-nums text-muted">
              {formatDuration(duration * 1000)}
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {buffering ? (
            <span className="text-[10px] uppercase tracking-wide text-muted">
              {t('player.buffering')}
            </span>
          ) : null}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={t('player.volume')}
            className="rounded-full p-2 text-muted transition hover:bg-white/10 hover:text-ink"
          >
            {muted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="w-24"
            aria-label={t('player.volume')}
            style={{
              background: `linear-gradient(to ${rtl ? 'left' : 'right'}, #9D5CFF ${
                (muted ? 0 : volume) * 100
              }%, rgba(255,255,255,0.18) ${(muted ? 0 : volume) * 100}%)`,
            }}
          />
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={t('player.queue')}
            className="relative rounded-full p-2 text-muted transition hover:bg-white/10 hover:text-ink"
          >
            <ListMusic className="h-4 w-4" />
            {queueLength > 0 ? (
              <span className="absolute -end-0.5 -top-0.5 rounded-full bg-primary px-1 text-[9px] font-bold text-white">
                {queueLength}
              </span>
            ) : null}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="rounded-full p-2 text-muted transition hover:bg-white/10 hover:text-ink lg:hidden"
          aria-label={t('player.expand')}
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
