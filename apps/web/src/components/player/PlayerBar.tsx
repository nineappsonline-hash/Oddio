'use client';

import { OddioPlayIcon } from '@/components/ui/OddioPlayIcon';
import { isPodcastPlayback } from '@/lib/podcast-playback';
import { ChevronDown, MoreHorizontal, Pause, Play, SkipForward, ListMusic } from 'lucide-react';
import { usePlayer } from '@/lib/player-store';
import { useLocale, useT } from '@/i18n/use-translator';
import { Artwork } from '@/components/ui/Artwork';
import { formatDuration } from '@/lib/utils';
import { OddioGlyph } from '@/components/ui/OddioGlyph';

export function PlayerBar({ podcastMode = false }: { podcastMode?: boolean }) {
  const t = useT();
  const rtl = useLocale() === 'ar';
  const track = usePlayer((state) => state.track);
  const podcast = isPodcastPlayback(track);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const currentTime = usePlayer((state) => state.currentTime);
  const duration = usePlayer((state) => state.duration);
  const buffering = usePlayer((state) => state.buffering);
  const error = usePlayer((state) => state.error);
  const retryPlayback = usePlayer((state) => state.retryPlayback);
  const toggle = usePlayer((state) => state.toggle);
  const next = usePlayer((state) => state.next);
  const seek = usePlayer((state) => state.seek);
  const setExpanded = usePlayer((state) => state.setExpanded);

  if (!track) {
    return (
      <div
        className={`oddio-player-bar oddio-idle-player ${podcastMode ? 'oddio-podcast-player-bar' : ''}`}
        role="region"
        aria-label={rtl ? 'مشغل أوديو' : 'Oddio music player'}
      >
        <div className="oddio-idle-cover">
          <OddioGlyph name="queue" size={22} />
        </div>
        <div className="oddio-idle-details">
          <strong>{rtl ? 'شغّل أي أغنية' : 'Your soundtrack starts here'}</strong>
          <span>
            {rtl
              ? 'اختار أغنية علشان تبدأ الاستماع'
              : 'Choose a track to start listening'}
          </span>
        </div>
        <div className="oddio-idle-controls" aria-hidden="true">
          <OddioGlyph name="previous" size={20} />
          <span className="oddio-idle-play">
            <OddioPlayIcon size={72} />
          </span>
          <OddioGlyph name="next" size={20} />
        </div>
        <div className="oddio-idle-track" aria-hidden="true">
          <span />
        </div>
        <span className="oddio-idle-watermark">ODDIO / HUMAN CURATED</span>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const albumValue = (track as typeof track & { album?: string | { name?: string; title?: string } }).album;
  const albumName = typeof albumValue === 'string' ? albumValue : (albumValue?.title || albumValue?.name);

  return (
    <section
      className={`oddio-player-bar oddio-top-mini-player relative z-40 mx-3 my-3 flex min-w-0 items-center gap-2 rounded-[20px] border border-white/[0.14] bg-[#17151d]/95 px-3 py-2.5 text-white shadow-[0_12px_35px_rgba(0,0,0,.28)] backdrop-blur-2xl sm:mx-5 lg:mx-7 lg:gap-4 lg:px-5 ${podcastMode ? 'oddio-podcast-player-bar' : ''}`}
      role="region"
      aria-label={t('player.miniPlayer')}
    >
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label={t('player.expand')}
        title={t('player.expand')}
        className="hidden shrink-0 items-center gap-2 border-e border-white/20 pe-4 text-lg font-black transition hover:opacity-80 lg:flex"
      >
        <OddioPlayIcon size={34} />
        <span>Oddio</span>
      </button>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex min-w-0 flex-1 items-center gap-2 text-start lg:max-w-[320px] lg:gap-3"
        aria-label={`${t('player.expand')}: ${track.title}`}
        title={t('player.expand')}
      >
        <Artwork title={track.title} url={track.artwork.url} accent={track.artwork.accent} className="h-11 w-11 shrink-0 sm:h-12 sm:w-12" rounded="rounded-lg" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span dir="auto" className="truncate text-sm font-extrabold text-white">{track.title}</span>
          <span dir="auto" className="truncate text-[11px] text-white/60">
            {track.artist?.name || (rtl ? 'فنان غير معروف' : 'Unknown artist')}
            {albumName ? ` · ${albumName}` : ''}
          </span>
        </span>
      </button>
      <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
        <span className="shrink-0 text-xs tabular-nums text-white/75">
          {formatDuration(currentTime * 1000)} / {formatDuration(duration * 1000)}
        </span>
        <input
          type="range" min={0} max={Math.max(duration, 0.1)} step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label={t('player.seek')}
          className="h-1 w-full min-w-0 cursor-pointer accent-[#b048eb]"
          style={{ background: `linear-gradient(to ${rtl ? 'left' : 'right'}, #b048eb ${progress}%, rgba(255,255,255,0.2) ${progress}%)` }}
        />
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button" onClick={toggle}
          aria-label={isPlaying ? t('common.pause') : t('common.play')}
          title={isPlaying ? t('common.pause') : t('common.play')}
          className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
        </button>
        <button type="button" onClick={() => next()} aria-label={t('common.next')} title={t('common.next')}
          className="hidden h-10 w-10 place-items-center rounded-full text-white/80 transition hover:bg-white/10 sm:grid">
          <SkipForward className="h-5 w-5" />
        </button>
        <button
          type="button" onClick={() => { window.dispatchEvent(new Event('oddio:open-queue')); setExpanded(true); }}
          aria-label={t('player.queue')} title={t('player.queue')}
          className="hidden h-10 w-10 place-items-center rounded-full text-white/80 transition hover:bg-white/10 lg:grid"
        >
          <ListMusic className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => setExpanded(true)}
          aria-label={t('player.expand')} title={t('player.expand')}
          className="hidden h-10 w-10 place-items-center rounded-full text-white/80 transition hover:bg-white/10 lg:grid">
          <MoreHorizontal className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => setExpanded(true)}
          aria-label={t('player.expand')} title={t('player.expand')}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white/85 transition hover:bg-white/10">
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
      {error ? (
        <button type="button" onClick={retryPlayback} className="absolute -bottom-9 end-0 rounded-lg bg-danger px-3 py-1 text-xs text-white">
          {t('common.retry')}
        </button>
      ) : null}
      {buffering ? <span className="sr-only">{t('player.buffering')}</span> : null}
      <div className="pointer-events-none absolute inset-x-3 bottom-0 h-[2px] overflow-hidden rounded-full bg-white/10 lg:hidden">
        <div className="h-full bg-[#b048eb]" style={{ width: `${progress}%` }} />
      </div>
    </section>
  );
}
