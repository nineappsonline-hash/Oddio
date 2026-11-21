'use client';

import { useEffect, useRef, useState } from 'react';
import { OddioPlayIcon } from '@/components/ui/OddioPlayIcon';
import { isPodcastPlayback } from '@/lib/podcast-playback';
import { ChevronDown, ChevronUp, MoreHorizontal, Pause, Play, SkipForward, ListMusic, Expand, ListPlus, Share2, Heart, HeartCrack } from 'lucide-react';
import { usePlayer } from '@/lib/player-store';
import { useLocale, useT } from '@/i18n/use-translator';
import { Artwork } from '@/components/ui/Artwork';
import { formatDuration } from '@/lib/utils';
import { OddioGlyph } from '@/components/ui/OddioGlyph';
import { AddToPlaylistButton } from '@/components/playlists/AddToPlaylistButton';
import { LikeButton } from '@/components/community/LikeButton';
import { DislikeButton } from '@/components/community/DislikeButton';
import { ShareButton } from '@/components/community/ShareButton';

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
  const [minimized, setMinimized] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!optionsOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!optionsRef.current?.contains(event.target as Node)) setOptionsOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOptionsOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [optionsOpen]);

  const showQueue = () => {
    setOptionsOpen(false);
    window.dispatchEvent(new Event('oddio:open-queue'));
    setExpanded(true);
  };


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

  if (minimized) {
    return (
      <div className="oddio-player-bar oddio-top-mini-player relative z-40 mx-3 my-3 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[#17151d]/95 px-3 py-2 text-white sm:mx-5 lg:mx-7" role="region" aria-label={t('player.miniPlayer')}>
        <button type="button" onClick={() => setMinimized(false)} className="flex min-w-0 flex-1 items-center gap-2 text-start" aria-label={rtl ? 'إظهار المشغّل' : 'Show player'}>
          <Artwork title={track.title} url={track.artwork.url} accent={track.artwork.accent} className="h-9 w-9 shrink-0" rounded="rounded-lg" />
          <span className="min-w-0 truncate text-sm font-bold">{track.title}</span>
          <ChevronUp className="h-4 w-4 shrink-0 text-white/70" />
        </button>
        <button type="button" onClick={toggle} aria-label={isPlaying ? t('common.pause') : t('common.play')} className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-white/10">
          {isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
        </button>
      </div>
    );
  }

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
          type="button" onClick={showQueue}
          aria-label={t('player.queue')} title={t('player.queue')}
          className="hidden h-10 w-10 place-items-center rounded-full text-white/80 transition hover:bg-white/10 lg:grid"
        >
          <ListMusic className="h-5 w-5" />
        </button>
        <div ref={optionsRef} className="relative hidden lg:block">
          <button type="button" onClick={() => setOptionsOpen((open) => !open)}
            aria-label={rtl ? 'خيارات المشغّل' : 'Player options'} aria-expanded={optionsOpen} aria-haspopup="menu"
            title={rtl ? 'خيارات المشغّل' : 'Player options'}
            className="grid h-10 w-10 place-items-center rounded-full text-white/80 transition hover:bg-white/10">
            <MoreHorizontal className="h-5 w-5" />
          </button>
          <div
            role="menu"
            aria-label={rtl ? 'خيارات الأغنية' : 'Track options'}
            className={`absolute end-0 top-full z-[100] mt-2 w-[235px] rounded-xl border border-white/20 bg-[#24202d] p-2 shadow-2xl ${optionsOpen ? 'block' : 'hidden'}`}
          >
            <button role="menuitem" type="button" onClick={() => { setOptionsOpen(false); setExpanded(true); }}
              className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-white hover:bg-white/10">
              <Expand className="h-4 w-4" /> {rtl ? 'المشغّل الكامل' : 'Full player'}
            </button>
            <button role="menuitem" type="button" onClick={showQueue}
              className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-white hover:bg-white/10">
              <ListMusic className="h-4 w-4" /> {t('player.queue')}
            </button>
            {!podcast ? (
              <>
                <div role="none" className="w-full [&_button]:min-h-10 [&_button]:w-full [&_button]:justify-start [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm [&_button]:text-white [&_button:hover]:bg-white/10">
                  <AddToPlaylistButton trackId={track.id} label={t('track.addToPlaylist')} />
                </div>
                <button role="menuitem" type="button"
                  onClick={() => {
                    const state = usePlayer.getState();
                    if (state.track?.id === track.id) {
                      setControlNotice(rtl ? 'الأغنية دي شغالة دلوقتي' : 'This track is already playing');
                    } else {
                      state.addToQueue(track);
                      setControlNotice(rtl ? 'اتضافت لقائمة الانتظار' : 'Added to queue');
                    }
                    setOptionsOpen(false);
                  }}
                  className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-white hover:bg-white/10">
                  <ListPlus className="h-4 w-4" /> {rtl ? 'إضافة لقائمة الانتظار' : 'Add to queue'}
                </button>
                <div className="my-1 border-t border-white/10" />
                <div role="none" className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 text-sm text-white">
                  <span className="inline-flex items-center gap-2"><Heart className="h-4 w-4" /> {rtl ? 'إعجاب' : 'Like'}</span>
                  <LikeButton key={track.id} trackId={track.id} initialLiked={track.isLiked} initialCount={track.likeCount} compact />
                </div>
                <div role="none" className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 text-sm text-white">
                  <span className="inline-flex items-center gap-2"><HeartCrack className="h-4 w-4" /> {rtl ? 'عدم إعجاب' : 'Dislike'}</span>
                  <DislikeButton key={track.id} trackId={track.id} />
                </div>
              </>
            ) : null}
            <div role="none" className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 text-sm text-white">
              <span className="inline-flex items-center gap-2"><Share2 className="h-4 w-4" /> {t('common.share')}</span>
              <div className="[&_button]:!text-xs [&_button]:!px-2">
                <ShareButton
                  title={track.title}
                  label={t('common.share')}
                  url={podcast
                    ? `/${rtl ? 'ar' : 'en'}/podcasts/episodes/${track.id}`
                    : `/${rtl ? 'ar' : 'en'}/tracks/${track.id}-${track.slug}`}
                />
              </div>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => { setOptionsOpen(false); setExpanded(true); }}
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
