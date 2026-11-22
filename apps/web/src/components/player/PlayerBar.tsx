'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { OddioPlayIcon } from '@/components/ui/OddioPlayIcon';
import { isPodcastPlayback } from '@/lib/podcast-playback';
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Pause,
  Play,
  SkipForward,
  ListMusic,
  Expand,
  ListPlus,
  Heart,
  HeartCrack,
  Moon,
  Shuffle,
  Repeat,
  Gauge,
  ExternalLink,
} from 'lucide-react';
import { usePlayer } from '@/lib/player-store';
import { useLocale, useT } from '@/i18n/use-translator';
import { Artwork } from '@/components/ui/Artwork';
import {
  PlayerMiniProgress,
  PlayerSeekProgress,
} from '@/components/player/PlayerProgress';
import { OddioGlyph } from '@/components/ui/OddioGlyph';
import { AddToPlaylistButton } from '@/components/playlists/AddToPlaylistButton';
import { LikeButton } from '@/components/community/LikeButton';
import { DislikeButton } from '@/components/community/DislikeButton';
import { ShareButton } from '@/components/community/ShareButton';
import {
  CompactPlayerVolumeControl,
  PlayerVolumeControl,
} from '@/components/player/PlayerVolumeControl';

export function PlayerBar({ podcastMode = false }: { podcastMode?: boolean }) {
  const t = useT();
  const rtl = useLocale() === 'ar';
  const track = usePlayer((state) => state.track);
  const podcast = isPodcastPlayback(track);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const buffering = usePlayer((state) => state.buffering);
  const error = usePlayer((state) => state.error);
  const retryPlayback = usePlayer((state) => state.retryPlayback);
  const toggle = usePlayer((state) => state.toggle);
  const next = usePlayer((state) => state.next);
  const setExpanded = usePlayer((state) => state.setExpanded);
  const shuffle = usePlayer((state) => state.shuffle);
  const toggleShuffle = usePlayer((state) => state.toggleShuffle);
  const repeat = usePlayer((state) => state.repeat);
  const cycleRepeat = usePlayer((state) => state.cycleRepeat);
  const playbackRate = usePlayer((state) => state.playbackRate);
  const setPlaybackRate = usePlayer((state) => state.setPlaybackRate);
  const sleepUntil = usePlayer((state) => state.sleepUntil);
  const setSleepTimer = usePlayer((state) => state.setSleepTimer);
  const [minimized, setMinimized] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [controlNotice, setControlNotice] = useState('');
  const [podcastReaction, setPodcastReaction] = useState<'like' | 'dislike' | null>(null);
  useEffect(() => {
    if (!podcast || !track?.id) {
      setPodcastReaction(null);
      return;
    }
    try {
      const value = window.localStorage.getItem(`oddio:podcast-reaction:${track.id}`);
      setPodcastReaction(value === 'like' || value === 'dislike' ? value : null);
    } catch {
      setPodcastReaction(null);
    }
  }, [podcast, track?.id]);
  const savePodcastReaction = (reaction: 'like' | 'dislike') => {
    if (!track) return;
    const next = podcastReaction === reaction ? null : reaction;
    try {
      const key = `oddio:podcast-reaction:${track.id}`;
      if (next) window.localStorage.setItem(key, next);
      else window.localStorage.removeItem(key);
      setPodcastReaction(next);
      setControlNotice(
        rtl ? 'تم حفظ رأيك على الجهاز ده' : 'Your feedback was saved on this device',
      );
    } catch {
      setControlNotice(rtl ? 'تعذر حفظ التفاعل' : 'Could not save feedback');
    }
  };
  const optionsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!controlNotice) return;
    const timeout = window.setTimeout(() => setControlNotice(''), 2500);
    return () => window.clearTimeout(timeout);
  }, [controlNotice]);

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
    // The full player mounts on demand; persist the panel request until it
    // has finished loading instead of firing an event before it exists.
    try {
      window.sessionStorage.setItem('oddio:pending-player-tab', 'queue');
    } catch {}
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

  const albumValue = (
    track as typeof track & { album?: string | { name?: string; title?: string } }
  ).album;
  const albumName =
    typeof albumValue === 'string' ? albumValue : albumValue?.title || albumValue?.name;

  if (minimized) {
    return (
      <div
        className="oddio-player-bar oddio-top-mini-player relative z-40 mx-3 my-3 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[#17151d]/95 px-3 py-2 text-white sm:mx-5 lg:mx-7"
        role="region"
        aria-label={t('player.miniPlayer')}
      >
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="flex min-w-0 flex-1 items-center gap-2 text-start"
          aria-label={rtl ? 'إظهار المشغّل' : 'Show player'}
        >
          <Artwork
            title={track.title}
            url={track.artwork.url}
            accent={track.artwork.accent}
            className="h-9 w-9 shrink-0"
            rounded="rounded-lg"
          />
          <span className="min-w-0 truncate text-sm font-bold">{track.title}</span>
          <ChevronUp className="h-4 w-4 shrink-0 text-white/70" />
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={isPlaying ? t('common.pause') : t('common.play')}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-white/10"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" fill="currentColor" />
          ) : (
            <Play className="h-5 w-5" fill="currentColor" />
          )}
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
        className="flex min-w-0 flex-1 items-center justify-start gap-2 text-start lg:w-auto lg:max-w-[310px] lg:flex-none lg:gap-2.5"
        aria-label={`${t('player.expand')}: ${track.title}`}
        title={t('player.expand')}
      >
        <Artwork
          title={track.title}
          url={track.artwork.url}
          accent={track.artwork.accent}
          className="h-11 w-11 shrink-0 sm:h-12 sm:w-12"
          rounded="rounded-lg"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:w-auto lg:max-w-[245px] lg:flex-none">
          <span dir="auto" className="truncate text-sm font-extrabold text-white">
            {track.title}
          </span>
          <span dir="auto" className="truncate text-[11px] text-white/60">
            {track.artist?.name || (rtl ? 'فنان غير معروف' : 'Unknown artist')}
            {albumName ? ` · ${albumName}` : ''}
          </span>
        </span>
      </button>
      <PlayerSeekProgress rtl={rtl} label={t('player.seek')} />
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={isPlaying ? t('common.pause') : t('common.play')}
          title={isPlaying ? t('common.pause') : t('common.play')}
          className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" fill="currentColor" />
          ) : (
            <Play className="h-5 w-5" fill="currentColor" />
          )}
        </button>
        <button
          type="button"
          onClick={() => next()}
          aria-label={t('common.next')}
          title={t('common.next')}
          className="hidden h-10 w-10 place-items-center rounded-full text-white/80 transition hover:bg-white/10 sm:grid"
        >
          <SkipForward className="h-5 w-5" />
        </button>
        <div className="flex shrink-0 items-center lg:hidden">
          <CompactPlayerVolumeControl rtl={rtl} label={t('player.volume')} />
        </div>
        <div className="hidden shrink-0 items-center border-s border-white/15 ps-2 lg:flex">
          <PlayerVolumeControl rtl={rtl} label={t('player.volume')} />
        </div>
        <button
          type="button"
          onClick={showQueue}
          aria-label={t('player.queue')}
          title={t('player.queue')}
          className="hidden h-10 w-10 place-items-center rounded-full text-white/80 transition hover:bg-white/10 lg:grid"
        >
          <ListMusic className="h-5 w-5" />
        </button>
        <div ref={optionsRef} className="relative hidden lg:block">
          <button
            type="button"
            onClick={() => setOptionsOpen((open) => !open)}
            aria-label={rtl ? 'خيارات المشغّل' : 'Player options'}
            aria-expanded={optionsOpen}
            aria-haspopup="menu"
            title={rtl ? 'خيارات المشغّل' : 'Player options'}
            className="grid h-10 w-10 place-items-center rounded-full text-white/80 transition hover:bg-white/10"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          <div
            role="menu"
            aria-label={rtl ? 'خيارات الأغنية' : 'Track options'}
            className={`absolute end-0 top-full z-[100] mt-2 max-h-[min(70vh,560px)] w-[260px] overflow-y-auto rounded-xl border border-white/20 bg-[#24202d] p-2 shadow-2xl ${optionsOpen ? 'block' : 'hidden'}`}
          >
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOptionsOpen(false);
                setExpanded(true);
              }}
              className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-white hover:bg-white/10"
            >
              <Expand className="h-4 w-4" /> {rtl ? 'المشغّل الكامل' : 'Full player'}
            </button>
            <button
              role="menuitem"
              type="button"
              onClick={showQueue}
              className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-white hover:bg-white/10"
            >
              <ListMusic className="h-4 w-4" /> {t('player.queue')}
            </button>
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                usePlayer.setState((state) => ({
                  queue: state.track ? [...state.queue, state.track] : state.queue,
                  queueUndo: null,
                }));
                setOptionsOpen(false);
                setControlNotice(rtl ? 'اتضاف لقائمة الانتظار' : 'Added to queue');
              }}
              className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-white hover:bg-white/10"
            >
              <ListPlus className="h-4 w-4" />
              {rtl ? 'إضافة لقائمة الانتظار' : 'Add to queue'}
            </button>
            {!podcast ? (
              <>
                <div
                  role="none"
                  className="w-full [&_button]:min-h-10 [&_button]:w-full [&_button]:justify-start [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm [&_button]:text-white [&_button:hover]:bg-white/10"
                >
                  <AddToPlaylistButton
                    key={track.id}
                    trackId={track.id}
                    label={t('track.addToPlaylist')}
                  />
                </div>
                <div className="my-1 border-t border-white/10" />
                <div
                  role="none"
                  className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 text-sm text-white"
                >
                  <span className="inline-flex items-center gap-2">
                    <Heart className="h-4 w-4" /> {rtl ? 'إعجاب' : 'Like'}
                  </span>
                  <LikeButton
                    key={track.id}
                    trackId={track.id}
                    initialLiked={track.isLiked}
                    initialCount={track.likeCount}
                    compact
                  />
                </div>
                <div
                  role="none"
                  className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 text-sm text-white"
                >
                  <span className="inline-flex items-center gap-2">
                    <HeartCrack className="h-4 w-4" /> {rtl ? 'عدم إعجاب' : 'Dislike'}
                  </span>
                  <DislikeButton key={track.id} trackId={track.id} />
                </div>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => toggleShuffle()}
                  aria-pressed={shuffle}
                  className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm text-white hover:bg-white/10"
                >
                  <span className="inline-flex items-center gap-2">
                    <Shuffle className="h-4 w-4" /> {rtl ? 'تشغيل عشوائي' : 'Shuffle'}
                  </span>
                  <span className="text-xs text-white/60">
                    {shuffle ? (rtl ? 'يعمل' : 'On') : rtl ? 'متوقف' : 'Off'}
                  </span>
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => cycleRepeat()}
                  className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm text-white hover:bg-white/10"
                >
                  <span className="inline-flex items-center gap-2">
                    <Repeat className="h-4 w-4" /> {rtl ? 'التكرار' : 'Repeat'}
                  </span>
                  <span className="text-xs text-white/60">{repeat}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => savePodcastReaction('like')}
                  aria-pressed={podcastReaction === 'like'}
                  className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm text-white hover:bg-white/10"
                >
                  <span className="inline-flex items-center gap-2">
                    <Heart className="h-4 w-4" /> {rtl ? 'إعجاب بالحلقة' : 'Like episode'}
                  </span>
                  {podcastReaction === 'like' ? (
                    <span className="text-xs text-primary">✓</span>
                  ) : null}
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => savePodcastReaction('dislike')}
                  aria-pressed={podcastReaction === 'dislike'}
                  className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm text-white hover:bg-white/10"
                >
                  <span className="inline-flex items-center gap-2">
                    <HeartCrack className="h-4 w-4" />{' '}
                    {rtl ? 'عدم إعجاب بالحلقة' : 'Dislike episode'}
                  </span>
                  {podcastReaction === 'dislike' ? (
                    <span className="text-xs text-primary">✓</span>
                  ) : null}
                </button>
                <p className="px-3 pb-1 text-[10px] leading-4 text-white/45">
                  {rtl
                    ? 'تفاعل الحلقات محفوظ على الجهاز ده فقط'
                    : 'Episode reactions are saved on this device only'}
                </p>
                <Link
                  role="menuitem"
                  href={`/${rtl ? 'ar' : 'en'}/podcasts/episodes/${track.id}`}
                  onClick={() => setOptionsOpen(false)}
                  className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-white hover:bg-white/10"
                >
                  <ExternalLink className="h-4 w-4" />{' '}
                  {rtl ? 'صفحة الحلقة' : 'Episode details'}
                </Link>
                {track.artist?.slug ? (
                  <Link
                    role="menuitem"
                    href={`/${rtl ? 'ar' : 'en'}/podcasts/shows/${track.artist.slug}`}
                    onClick={() => setOptionsOpen(false)}
                    className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-white hover:bg-white/10"
                  >
                    <ExternalLink className="h-4 w-4" />{' '}
                    {rtl ? 'صفحة البودكاست' : 'Podcast show'}
                  </Link>
                ) : null}
              </>
            )}
            <div className="my-1 border-t border-white/10" />
            {podcast ? (
              <label
                role="none"
                className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 text-sm text-white"
              >
                <span className="inline-flex items-center gap-2">
                  <Gauge className="h-4 w-4" /> {rtl ? 'السرعة' : 'Speed'}
                </span>
                <select
                  aria-label={rtl ? 'سرعة التشغيل' : 'Playback speed'}
                  value={playbackRate}
                  onChange={(event) => setPlaybackRate(Number(event.target.value))}
                  className="rounded-md border border-white/20 bg-[#292332] px-2 py-1 text-xs text-white"
                >
                  {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}x
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label
              role="none"
              className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 text-sm text-white"
            >
              <span className="inline-flex items-center gap-2">
                <Moon className="h-4 w-4" /> {rtl ? 'مؤقت النوم' : 'Sleep timer'}
              </span>
              <select
                aria-label={rtl ? 'مؤقت النوم' : 'Sleep timer'}
                value={sleepUntil ? 'active' : 'off'}
                onChange={(event) =>
                  setSleepTimer(
                    event.target.value === 'off' ? 0 : Number(event.target.value),
                  )
                }
                className="max-w-24 rounded-md border border-white/20 bg-[#292332] px-1 py-1 text-xs text-white"
              >
                <option value="off">{rtl ? 'إيقاف' : 'Off'}</option>
                {sleepUntil ? (
                  <option value="active" disabled>
                    {rtl ? 'يعمل' : 'On'}
                  </option>
                ) : null}
                {[5, 15, 30, 60].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} {rtl ? 'د' : 'min'}
                  </option>
                ))}
              </select>
            </label>
            <div
              role="none"
              className="rounded-lg px-1 py-1 text-sm text-white [&_button]:!min-h-10 [&_button]:!w-full [&_button]:!justify-start [&_button]:!border-0 [&_button]:!bg-transparent [&_button]:!px-2 [&_button]:!text-sm [&_button:hover]:!bg-white/10"
            >
              <ShareButton
                storyTrack={track}
                title={track.title}
                label={t('common.share')}
                url={
                  podcast
                    ? `/${rtl ? 'ar' : 'en'}/podcasts/episodes/${track.id}`
                    : `/${rtl ? 'ar' : 'en'}/tracks/${track.id}-${track.slug}`
                }
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setOptionsOpen(false);
            setExpanded(true);
          }}
          aria-label={t('player.expand')}
          title={t('player.expand')}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white/85 transition hover:bg-white/10"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
      {controlNotice ? (
        <span
          role="status"
          className="absolute end-2 top-full z-40 mt-2 rounded-lg border border-white/20 bg-[#24202d] px-3 py-2 text-xs text-white shadow-lg"
        >
          {controlNotice}
        </span>
      ) : null}
      {error ? (
        <button
          type="button"
          onClick={retryPlayback}
          className="absolute -bottom-9 end-0 rounded-lg bg-danger px-3 py-1 text-xs text-white"
        >
          {t('common.retry')}
        </button>
      ) : null}
      {buffering ? <span className="sr-only">{t('player.buffering')}</span> : null}
      <PlayerMiniProgress />
    </section>
  );
}
