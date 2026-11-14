'use client';

import Link from 'next/link';
import { OddioPlayIcon } from '@/components/ui/OddioPlayIcon';
import { useEffect, useState } from 'react';
import { Maximize2, Repeat, Repeat1, VolumeX } from 'lucide-react';
import { usePlayer } from '@/lib/player-store';
import { useLocale, useT } from '@/i18n/use-translator';
import { Artwork } from '@/components/ui/Artwork';
import { AddToPlaylistButton } from '@/components/playlists/AddToPlaylistButton';
import { Equalizer } from '@/components/visuals/Equalizer';
import { cn, formatDuration } from '@/lib/utils';
import { OddioGlyph } from '@/components/ui/OddioGlyph';

export function PlayerBar() {
  const t = useT();
  const [controlNotice, setControlNotice] = useState('');
  useEffect(() => {
    if (!controlNotice) return;
    const timer = window.setTimeout(() => setControlNotice(''), 2000);
    return () => window.clearTimeout(timer);
  }, [controlNotice]);

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
  const retryPlayback = usePlayer((state) => state.retryPlayback);
  const toggle = usePlayer((state) => state.toggle);
  const next = usePlayer((state) => state.next);
  const previous = usePlayer((state) => state.previous);
  const seek = usePlayer((state) => state.seek);
  const setVolume = usePlayer((state) => state.setVolume);
  const toggleMute = usePlayer((state) => state.toggleMute);
  const cycleRepeat = usePlayer((state) => state.cycleRepeat);
  const toggleShuffle = usePlayer((state) => state.toggleShuffle);
  const setExpanded = usePlayer((state) => state.setExpanded);

  if (!track) {
    return (
      <div
        className="oddio-player-bar oddio-idle-player"
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

  return (
    <div
      className="oddio-player-bar fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-40 overflow-visible border-t border-white/10 bg-[#181818]/95 px-3 py-2.5 shadow-[0_-20px_60px_-30px_rgba(0,0,0,0.6)] backdrop-blur-2xl lg:bottom-0 lg:start-64 lg:end-0 lg:px-6"
      role="region"
      aria-label={t('player.miniPlayer')}
      title={t('player.miniPlayer')}
    >
      {controlNotice ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute bottom-full mb-3 left-1/2 z-[90] -translate-x-1/2 whitespace-nowrap rounded-full border border-primary/40 bg-[#242027] px-4 py-2 text-sm font-bold text-white shadow-xl"
        >
          {controlNotice}
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 start-1/4 h-40 w-80 opacity-30 blur-3xl"
        style={{
          background: `radial-gradient(circle, ${track.artwork.accent}, transparent 70%)`,
        }}
      />
      {error ? (
        <div
          role="alert"
          className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-xs text-ink"
        >
          <span>
            {rtl ? 'تعذّر تشغيل الأغنية. جرّب مرة تانية.' : 'Unable to play this track.'}
          </span>
          <button
            type="button"
            onClick={retryPlayback}
            className="shrink-0 rounded-full border border-primary/50 px-3 py-1.5 font-semibold text-primary hover:bg-primary/10"
          >
            {t('common.retry')}
          </button>
        </div>
      ) : null}
      <div className="mb-2 flex min-w-0 items-center gap-3 border-b border-white/10 pb-2 lg:hidden">
        <button type="button" onClick={() => setExpanded(true)} className="shrink-0" aria-label={t('player.expand')}>
          <Artwork title={track.title} url={track.artwork.url} accent={track.artwork.accent} className="h-10 w-10" rounded="rounded-lg" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link href={`/${rtl ? 'ar' : 'en'}/tracks/${track.id}-${track.slug}`} className="block w-full truncate text-xs font-semibold leading-4 text-white">{track.title}</Link>
          {track.artist ? <Link href={`/${rtl ? 'ar' : 'en'}/artists/${track.artist.slug}`} className="block w-full truncate text-[11px] leading-4 text-muted">{track.artist.name}</Link> : null}
        </div>
        <button type="button" onClick={() => setExpanded(true)} className="shrink-0 rounded-full border border-white/10 p-2 text-muted" aria-label={t('player.expand')}><Maximize2 className="h-4 w-4" /></button>
      </div>
      <div className="flex min-w-0 items-center justify-center gap-1 lg:gap-3">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="group/art relative hidden shrink-0 lg:block"
          aria-label={t('player.expand')}
          title={t('player.expand')}
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
        <div className="hidden min-w-0 flex-1 lg:flex lg:flex-none lg:basis-56 lg:flex-col">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/${rtl ? 'ar' : 'en'}/tracks/${track.id}-${track.slug}`}
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
              href={`/${rtl ? 'ar' : 'en'}/artists/${track.artist.slug}`}
              className="block truncate text-xs text-muted hover:text-ink"
            >
              {track.artist.name}
            </Link>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="flex w-full items-center justify-between gap-1 sm:justify-center sm:gap-3">
            <button
              type="button"
              onClick={() => {
                toggleShuffle();
                setControlNotice(
                  rtl
                    ? shuffle
                      ? 'إيقاف التشغيل العشوائي'
                      : 'تشغيل عشوائي'
                    : shuffle
                      ? 'Shuffle off'
                      : 'Shuffle on',
                );
              }}
              aria-label={t('player.shuffle')}
              title={
                shuffle
                  ? rtl
                    ? 'إيقاف التشغيل العشوائي'
                    : 'Disable shuffle'
                  : t('player.shuffle')
              }
              aria-pressed={shuffle}
              className={cn(
                'rounded-full p-1.5 transition hover:bg-white/10 sm:p-2',
                shuffle ? 'text-primary' : 'text-muted',
              )}
            >
              <OddioGlyph name="soundspace" size={18} className="oddio-glyph" />
            </button>
            <button
              type="button"
              onClick={previous}
              aria-label={t('common.previous')}
              title={t('common.previous')}
              className="rounded-full p-2 text-muted transition hover:bg-white/10 hover:text-ink"
            >
              <OddioGlyph name="previous" size={19} className="oddio-glyph" />
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label={isPlaying ? t('common.pause') : t('common.play')}
              title={isPlaying ? t('common.pause') : t('common.play')}
              className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full bg-transparent transition-transform hover:scale-105 sm:h-[88px] sm:w-[88px]"
            >
              {isPlaying ? (
                <span className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[#f2f2f2] text-[#101010] sm:h-[72px] sm:w-[72px]"><OddioGlyph name="pause" size={21} className="oddio-glyph" /></span>
              ) : (
                <span className="scale-[0.72] sm:scale-100"><OddioPlayIcon size={88} /></span>
              )}
            </button>
            <button
              type="button"
              onClick={() => next()}
              aria-label={t('common.next')}
              title={t('common.next')}
              className="rounded-full p-2 text-muted transition hover:bg-white/10 hover:text-ink"
            >
              <OddioGlyph name="next" size={19} className="oddio-glyph" />
            </button>
            <button
              type="button"
              onClick={() => {
                cycleRepeat();
                const mode = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
                setControlNotice(
                  rtl
                    ? mode === 'off'
                      ? 'التكرار متوقف'
                      : mode === 'all'
                        ? 'تكرار كل الأغاني'
                        : 'تكرار الأغنية الحالية'
                    : mode === 'off'
                      ? 'Repeat off'
                      : mode === 'all'
                        ? 'Repeat all'
                        : 'Repeat one',
                );
              }}
              aria-label={t('player.repeat')}
              title={
                repeat === 'off'
                  ? rtl
                    ? 'تكرار كل الأغاني'
                    : 'Repeat all'
                  : repeat === 'all'
                    ? rtl
                      ? 'تكرار أغنية واحدة'
                      : 'Repeat one'
                    : rtl
                      ? 'إيقاف التكرار'
                      : 'Disable repeat'
              }
              className={cn(
                'rounded-full p-1.5 transition hover:bg-white/10 sm:p-2',
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
              title={t('player.seek')}
              style={{
                background: `linear-gradient(to ${rtl ? 'left' : 'right'}, #F2F2F2 ${progress}%, rgba(255,255,255,0.18) ${progress}%)`,
              }}
            />
            <span className="w-10 text-[10px] tabular-nums text-muted">
              {formatDuration(duration * 1000)}
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <AddToPlaylistButton trackId={track.id} label={t('track.addToPlaylist')} />
          {buffering ? (
            <span className="text-[10px] uppercase tracking-wide text-muted">
              {t('player.buffering')}
            </span>
          ) : null}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={t('player.volume')}
            title={t('player.volume')}
            className="rounded-full p-2 text-muted transition hover:bg-white/10 hover:text-ink"
          >
            {muted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <OddioGlyph name="volume" size={18} className="oddio-glyph" />
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
            title={t('player.volume')}
            style={{
              background: `linear-gradient(to ${rtl ? 'left' : 'right'}, #F2F2F2 ${
                (muted ? 0 : volume) * 100
              }%, rgba(255,255,255,0.18) ${(muted ? 0 : volume) * 100}%)`,
            }}
          />
          <button
            type="button"
            onClick={() => { window.dispatchEvent(new Event('oddio:open-queue')); setExpanded(true); }}
            aria-label={t('player.queue')}
            title={t('player.queue')}
            className="relative rounded-full p-2 text-muted transition hover:bg-white/10 hover:text-ink"
          >
            <OddioGlyph name="queue" size={19} className="oddio-glyph" />
            {queueLength > 0 ? (
              <span className="absolute -end-0.5 -top-0.5 rounded-full bg-primary px-1 text-[9px] font-bold text-white">
                {queueLength}
              </span>
            ) : null}
          </button>
        </div>

        <button
          type="button"
          onClick={() => { window.dispatchEvent(new Event('oddio:open-queue')); setExpanded(true); }}
          className="relative hidden shrink-0 rounded-full p-2 text-muted transition hover:bg-white/10 hover:text-ink sm:inline-flex lg:hidden"
          aria-label={t('player.queue')}
          title={t('player.queue')}
        >
          <OddioGlyph name="queue" size={20} className="oddio-glyph" />
          {queueLength > 0 ? <span className="absolute -end-0.5 -top-0.5 rounded-full bg-primary px-1 text-[9px] font-bold text-white">{queueLength}</span> : null}
        </button>

        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="hidden rounded-full p-2 text-muted transition hover:bg-white/10 hover:text-ink sm:inline-flex lg:hidden"
          aria-label={t('player.expand')}
          title={t('player.expand')}
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
