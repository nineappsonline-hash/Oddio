'use client';

import Link from 'next/link';
import { OddioPlayIcon } from '@/components/ui/OddioPlayIcon';
import { isPodcastPlayback } from '@/lib/podcast-playback';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ListMusic,
  Moon,
  MoreHorizontal,
  Mic2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  X,
} from 'lucide-react';
import { usePlayer } from '@/lib/player-store';
import { useLocale, useT } from '@/i18n/use-translator';
import { Artwork } from '@/components/ui/Artwork';
import { DragReorderList } from '@/components/ui/DragReorderList';
import { AutoScrollTitle } from '@/components/ui/AutoScrollTitle';
import { CompactPlayerVolumeControl, PlayerVolumeControl } from '@/components/player/PlayerVolumeControl';
import { SaveQueueAsPlaylist } from '@/components/player/SaveQueueAsPlaylist';
import { AddToPlaylistButton } from '@/components/playlists/AddToPlaylistButton';
import { Badge } from '@/components/ui/Badge';
import { LikeButton } from '@/components/community/LikeButton';
import { DislikeButton } from '@/components/community/DislikeButton';
import { TimedComments } from '@/components/community/TimedComments';
import { ShareButton } from '@/components/community/ShareButton';
import { SimilarPlayerPanel } from '@/components/player/SimilarPlayerPanel';
import { Sparkles } from 'lucide-react';
import { Equalizer } from '@/components/visuals/Equalizer';
import { cn, formatDuration, formatNumber } from '@/lib/utils';

type LyricCue = { start: number; end: number; text: string };
function parseSrt(source: string): LyricCue[] {
  const toSeconds = (value: string) => {
    const [h, m, rest] = value.split(':');
    const [sec, ms] = (rest || '').split(',');
    return Number(h) * 3600 + Number(m) * 60 + Number(sec) + Number(ms) / 1000;
  };
  return source
    .replace(/\r/g, '')
    .trim()
    .split(/\n\s*\n/)
    .flatMap((block) => {
      const lines = block.split('\n');
      const index = lines.findIndex((line) => /\d{2}:\d{2}:\d{2},\d{3}\s*-->/.test(line));
      if (index < 0) return [];
      const match = lines[index]?.match(
        /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/,
      );
      if (!match) return [];
      const start = toSeconds(match[1]!);
      const end = toSeconds(match[2]!);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
      return [
        {
          start,
          end,
          text: lines
            .slice(index + 1)
            .join(' ')
            .replace(/<[^>]*>/g, '')
            .trim(),
        },
      ];
    })
    .filter((cue) => cue.text)
    .sort((a, b) => a.start - b.start);
}

export function FullPlayer() {
  const t = useT();
  const [srt, setSrt] = useState<string | null>(null);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [generatingLyrics, setGeneratingLyrics] = useState(false);
  const [lyricsMessage, setLyricsMessage] = useState('');
  const [mobileLyricsOpen, setMobileLyricsOpen] = useState(false);
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);
  const mobileOptionsRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [controlNotice, setControlNotice] = useState('');
  useEffect(() => {
    if (!controlNotice) return;
    const timer = window.setTimeout(() => setControlNotice(''), 2000);
    return () => window.clearTimeout(timer);
  }, [controlNotice]);
  const [sideTab, setSideTab] = useState<'lyrics' | 'queue' | 'similar'>('similar');
  useEffect(() => {
    const showQueue = () => setSideTab('queue');
    window.addEventListener('oddio:open-queue', showQueue);
    return () => window.removeEventListener('oddio:open-queue', showQueue);
  }, []);
  const rtl = useLocale() === 'ar';
  useEffect(() => {
    if (!mobileOptionsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!mobileOptionsRef.current?.contains(event.target as Node)) setMobileOptionsOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOptionsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [mobileOptionsOpen]);

  // A browser Back from the overlay's same-URL history entry should only
  // minimize the full player, leaving playback and the underlying page intact.
  // Forward can reopen the overlay if the audio item is still available.
  useEffect(() => {
    const onPopState = () => {
      const state = usePlayer.getState();
      const isOverlayEntry = Boolean(window.history.state?.__oddioFullPlayer);
      if (state.expanded && !isOverlayEntry) {
        usePlayer.setState({ expanded: false });
      } else if (!state.expanded && isOverlayEntry && state.track) {
        usePlayer.setState({ expanded: true });
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const expanded = usePlayer((state) => state.expanded);
  const track = usePlayer((state) => state.track);
  const podcast = isPodcastPlayback(track);
  useEffect(() => {
    if (track?.id) setSideTab('similar');
  }, [track?.id]);
  const hasTrack = Boolean(track);
  const queue = usePlayer((state) => state.queue);
  const canUndoQueue = usePlayer((state) => state.queueUndo !== null);
  const undoQueue = usePlayer((state) => state.undoQueue);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const error = usePlayer((state) => state.error);
  const retryPlayback = usePlayer((state) => state.retryPlayback);
  const currentTime = usePlayer((state) => state.currentTime);
  const duration = usePlayer((state) => state.duration);
  const repeat = usePlayer((state) => state.repeat);
  const shuffle = usePlayer((state) => state.shuffle);
  const autoplay = usePlayer((state) => state.autoplay);
  const crossfadeSeconds = usePlayer((state) => state.crossfadeSeconds);
  const playbackRate = usePlayer((state) => state.playbackRate);
  const setPlaybackRate = usePlayer((state) => state.setPlaybackRate);
  const sleepUntil = usePlayer((state) => state.sleepUntil);
  const setSleepTimer = usePlayer((state) => state.setSleepTimer);
  const setCrossfadeSeconds = usePlayer((state) => state.setCrossfadeSeconds);
  const setExpanded = usePlayer((state) => state.setExpanded);
  const toggle = usePlayer((state) => state.toggle);
  const next = usePlayer((state) => state.next);
  const previous = usePlayer((state) => state.previous);
  const seek = usePlayer((state) => state.seek);
  const cycleRepeat = usePlayer((state) => state.cycleRepeat);
  const toggleShuffle = usePlayer((state) => state.toggleShuffle);
  const toggleAutoplay = usePlayer((state) => state.toggleAutoplay);
  const jumpTo = usePlayer((state) => state.jumpTo);
  const removeFromQueue = usePlayer((state) => state.removeFromQueue);
  const moveInQueue = usePlayer((state) => state.moveInQueue);
  const reorderQueue = usePlayer((state) => state.reorderQueue);
  const clearQueue = usePlayer((state) => state.clearQueue);

  // The full player is a modal: lock background scrolling and keep keyboard
  // focus inside it, restoring the opener when the modal closes.
  useEffect(() => {
    if (!expanded || !hasTrack) return;
    const previousOverflow = document.body.style.overflow;
    const opener = document.activeElement;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [expanded, hasTrack]);

  useEffect(() => {
    if (!expanded || !hasTrack) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Child actions can open their own portaled dialog. Let that topmost
      // dialog handle Escape and Tab rather than stealing focus or closing
      // the underlying full player.
      const nestedDialogOpen = Array.from(
        document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'),
      ).some(
        (dialog) => dialog !== dialogRef.current && !dialogRef.current?.contains(dialog),
      );
      if (nestedDialogOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (mobileLyricsOpen) setMobileLyricsOpen(false);
        else setExpanded(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [expanded, hasTrack, mobileLyricsOpen, setExpanded]);

  useEffect(() => {
    if (!track?.id || isPodcastPlayback(track)) {
      setSrt(null);
      setPlainLyrics(null);
      setLyricsLoading(false);
      return;
    }
    const controller = new AbortController();
    setSrt(null);
    setPlainLyrics(null);
    setLyricsMessage('');
    setMobileLyricsOpen(false);
    setLyricsLoading(true);
    fetch('/api/tracks/' + encodeURIComponent(track.id) + '/synced-lyrics', {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (!controller.signal.aborted) {
          setSrt(result?.data?.srt || null);
          setPlainLyrics(result?.data?.text || null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLyricsLoading(false);
      });
    return () => controller.abort();
  }, [track?.id]);
  async function generateLyrics() {
    if (!track || generatingLyrics) return;
    setGeneratingLyrics(true);
    setLyricsMessage(
      rtl ? 'جاري استخراج الكلمات والتوقيتات…' : 'Generating timed lyrics…',
    );
    try {
      const response = await fetch(
        '/api/tracks/' + encodeURIComponent(track.id) + '/generate-lyrics',
        { method: 'POST' },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || 'Generation failed');
      if (result?.data?.status === 'ready' && result.data.srt) {
        setSrt(result.data.srt);
        setPlainLyrics(result.data.text || null);
        setLyricsMessage(
          rtl ? 'تم حفظ الكلمات لكل المستمعين' : 'Lyrics saved for all listeners',
        );
      } else if (result?.data?.status === 'processing') {
        setLyricsMessage(
          rtl
            ? 'التوليد شغال بالفعل. جرّب تفتح الكلمات بعد شوية.'
            : 'Already generating. Check again shortly.',
        );
      } else {
        setLyricsMessage(
          result?.data?.message ||
            (rtl ? 'التوليد غير متاح حاليًا' : 'Generation unavailable'),
        );
      }
    } catch (error) {
      setLyricsMessage(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setGeneratingLyrics(false);
    }
  }
  const cues = useMemo(() => (srt ? parseSrt(srt) : []), [srt]);
  const activeCue = cues.findIndex(
    (cue) => currentTime >= cue.start && currentTime < cue.end,
  );
  if (!expanded || !track) return null;

  const accent = track.artwork.accent;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="oddio-full-player fixed inset-0 z-[60] h-[100dvh] w-full max-w-full overflow-x-hidden overflow-y-auto overscroll-contain bg-[#090a0c] text-white scroll-thin"
      role="dialog"
      aria-modal="true"
      aria-label={t('player.fullPlayer')}
      title={t('player.fullPlayer')}
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(850px 620px at 22% 28%, rgba(255,255,255,0.075), transparent 72%), radial-gradient(700px 540px at 88% 85%, rgba(160,160,160,0.045), transparent 74%)',
        }}
      />
      {controlNotice ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 z-[90] w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full border border-white/20 bg-[#171819]/95 px-4 py-2 text-center text-sm font-bold text-white shadow-xl backdrop-blur-xl"
        >
          {controlNotice}
        </div>
      ) : null}
      <div className="relative mx-auto flex min-h-[100dvh] w-full min-w-0 max-w-[1380px] flex-col px-2 py-2 pb-[max(8px,env(safe-area-inset-bottom))] sm:px-8 sm:py-8 lg:block lg:min-h-0 lg:px-8 lg:py-5">
        <div className="mb-6 hidden items-center justify-between rounded-2xl lg:flex border border-white/[0.13] bg-white/[0.055] backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] px-4 py-3 lg:mb-5 lg:px-5 lg:py-2">
          <div className="flex items-center gap-2 text-sm text-muted">
            <OddioPlayIcon size={36} />
            <span className="text-base font-black tracking-tight text-white lg:text-xl">
              Oddio
            </span>
            <div className="ms-4 flex min-w-0 items-center gap-3 border-s border-white/15 ps-4">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/15">
                <Artwork title={track.title} url={track.artwork.url} accent={track.artwork.accent} className="h-full w-full" rounded="rounded-lg" />
              </div>
              <div className="min-w-0">
                <p dir="auto" className="max-w-[260px] truncate text-sm font-bold text-white xl:max-w-[420px]">{track.title}</p>
                <p dir="auto" className="max-w-[260px] truncate text-xs text-white/55 xl:max-w-[420px]">
                  {track.artist?.name || (rtl ? 'فنان غير معروف' : 'Unknown artist')}
                  {(() => {
                    const album = (track as typeof track & { album?: string | { title?: string; name?: string } }).album;
                    const albumName = typeof album === 'string' ? album : album?.title || album?.name;
                    return albumName ? ` · ${albumName}` : '';
                  })()}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-muted transition hover:bg-white/10 hover:text-ink"
            aria-label={t('player.minimize')}
            title={t('player.minimize')}
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 hidden lg:block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#cacaca]">
            {rtl ? 'قيد التشغيل' : 'NOW PLAYING'}
          </span>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-white">
            {rtl ? 'مساحتك للاستماع' : 'Your listening space'}
          </h2>
          <p className="mt-1 text-sm text-[#999999]">
            {rtl
              ? 'استمتع بالموسيقى والبودكاست في مكان واحد'
              : 'Immersive audio. Seamless control.'}
          </p>
        </div>
        <div className="grid w-full min-w-0 flex-1 grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(290px,0.9fr)] lg:items-start">
          <div
            className={cn(
              'oddio-mobile-player-card min-h-0 min-w-0 flex-col justify-between rounded-[24px] border border-white/[0.13] bg-white/[0.055] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[28px] sm:rounded-[28px] sm:p-6 lg:block lg:p-5',
              sideTab === 'queue' ? 'hidden lg:block' : 'flex',
            )}
          >
        <div className="mb-3 flex items-center justify-start gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label={t('player.minimize')}
            title={t('player.minimize')}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ChevronDown className="h-5 w-5" aria-hidden="true" />
          </button>

        </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-evenly gap-3 sm:gap-5 lg:grid lg:flex-none lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:items-center lg:gap-5">
              <div className="oddio-mobile-artwork relative mx-auto w-full max-w-[min(78vw,40dvh,320px)] sm:max-w-md lg:max-w-[330px] xl:max-w-[360px]">
                <div
                  aria-hidden="true"
                  className="absolute -inset-2 rounded-[2.5rem] opacity-25 blur-2xl sm:-inset-4 sm:opacity-30 sm:blur-3xl"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(210,210,210,0.24), transparent 70%)',
                  }}
                />
                <div className="relative overflow-hidden rounded-[20px] border border-white/[0.16] bg-white/[0.055] p-1 shadow-[0_15px_45px_rgba(0,0,0,.35)] backdrop-blur-xl sm:rounded-[26px] sm:p-1.5">

                  <Artwork
                    title={track.title}
                    animated={isPlaying && !track.artwork.url}
                    url={track.artwork.url}
                    accent={accent}
                    className="aspect-square w-full shadow-glow"
                    rounded="rounded-[1.35rem]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-24 animate-spin-slow opacity-15 [background:conic-gradient(from_0deg,transparent_0deg,rgba(220,220,220,0.22)_70deg,transparent_140deg,rgba(255,255,255,0.16)_240deg,transparent_300deg)]"
                  />
                  {!podcast && mobileLyricsOpen ? (
                    <div
                      id="oddio-mobile-lyrics"
                      className="absolute inset-1.5 z-40 flex min-h-0 flex-col overflow-y-auto overscroll-contain rounded-[1.35rem] bg-[#121314]/95 p-3 backdrop-blur-xl sm:p-4 lg:hidden"
                    >
                      <div className="mb-2 flex items-center justify-between text-sm font-bold text-white">
                        <span>🎤 {rtl ? 'كلمات الأغنية' : 'Lyrics'}</span>
                        <button
                          type="button"
                          onClick={() => setMobileLyricsOpen(false)}
                          aria-label={rtl ? 'إغلاق كلمات الأغنية' : 'Close lyrics'}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-white/10 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          {rtl ? 'إغلاق' : 'Close'}
                        </button>
                      </div>
                      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto">
                        {lyricsLoading ? (
                          <p className="text-sm text-white/70">
                            {rtl ? 'جاري التحميل…' : 'Loading…'}
                          </p>
                        ) : cues.length ? (
                          <div
                            aria-live="off"
                            className="flex w-full flex-col items-center justify-center px-2 text-center"
                          >
                            <div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-neutral-300/70">
                              <Mic2 className="h-3.5 w-3.5" />{' '}
                              {rtl ? 'كلمات متزامنة' : 'LIVE LYRICS'}
                            </div>
                            <p
                              key={activeCue}
                              dir="auto"
                              className="transition-all duration-300 text-balance text-center text-xl font-extrabold leading-relaxed text-white drop-shadow-[0_0_20px_rgba(188,103,255,0.55)] sm:text-2xl"
                            >
                              {activeCue >= 0 ? cues[activeCue]?.text : '♪'}
                            </p>
                          </div>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                            <p className="text-sm text-white/80">
                              {rtl ? 'مفيش كلمات محفوظة للأغنية' : 'No saved lyrics yet'}
                            </p>
                            <button
                              type="button"
                              disabled={generatingLyrics}
                              onClick={generateLyrics}
                              className="rounded-xl bg-white/20 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                            >
                              {generatingLyrics
                                ? rtl
                                  ? 'جاري التوليد…'
                                  : 'Generating…'
                                : '✨ Generate Lyrics'}
                            </button>
                            {lyricsMessage ? (
                              <p role="status" className="text-xs text-white/80">
                                {lyricsMessage}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
                {!podcast && (
                  <div className="relative z-30 mt-3 flex items-center justify-center lg:hidden">
                    <button
                      type="button"
                      aria-expanded={mobileLyricsOpen}
                      aria-controls="oddio-mobile-lyrics"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setMobileLyricsOpen((value) => !value);
                      }}
                      className={cn(
                        'relative z-30 inline-flex min-h-11 touch-manipulation cursor-pointer items-center justify-center gap-2.5 rounded-full border px-5 py-2.5 text-sm font-semibold shadow-lg backdrop-blur-md transition-all duration-200 active:scale-95',
                        mobileLyricsOpen
                          ? 'border-white/35 bg-white/20 text-white shadow-black/20'
                          : 'border-white/15 bg-white/[0.08] text-white/90 hover:border-white/35 hover:bg-white/[0.14]',
                      )}
                    >
                      <Mic2 className="h-4 w-4 text-neutral-200" />
                      <span>
                        {mobileLyricsOpen
                          ? rtl
                            ? 'إخفاء الكلمات'
                            : 'Hide lyrics'
                          : rtl
                            ? 'عرض الكلمات'
                            : 'Show lyrics'}
                      </span>
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          mobileLyricsOpen ? 'bg-neutral-300' : 'bg-neutral-400/70',
                        )}
                      />
                    </button>
                  </div>
                )}
                <div className="mt-3 hidden h-8 items-end justify-center gap-1 sm:flex lg:hidden">
                  <Equalizer
                    bars={28}
                    paused={!isPlaying}
                    className="h-full w-full max-w-xs text-neutral-300/70"
                  />
                </div>
              </div>
              <div className="flex min-w-0 flex-col justify-center gap-2 sm:mt-6 sm:gap-5 lg:mt-0">
                <div className="min-w-0">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-[.17em] text-[#bdbdbd] sm:mb-3 sm:text-[11px]">
                    {podcast
                      ? rtl
                        ? 'حلقة بودكاست'
                        : 'PODCAST EPISODE'
                      : rtl
                        ? 'أغنية'
                        : 'MUSIC / TRACK'}
                  </span>
                  <h1 className="min-w-0 text-[clamp(19px,5.3vw,27px)] font-black tracking-tight text-white sm:text-3xl lg:text-[clamp(22px,1.9vw,32px)]">
                    <AutoScrollTitle text={track.title} lines={2} />
                  </h1>
                  {track.artist ? (
                    <Link
                      href={
                        podcast
                          ? `/${rtl ? 'ar' : 'en'}/podcasts/shows/${track.artist.slug}`
                          : `/${rtl ? 'ar' : 'en'}/artists/${track.artist.slug}`
                      }
                      className="mt-1 inline-block text-sm font-semibold text-[#c9c9c9] transition hover:text-white sm:mt-3 sm:text-base"
                    >
                      {track.artist.name}
                    </Link>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone="cyan">{track.qualityLabel}</Badge>
                    {!podcast && (
                      <Badge tone="primary">
                        {track.productionType === 'fully_ai'
                          ? t('track.fullyAi')
                          : t('track.aiAssisted')}
                      </Badge>
                    )}
                    {track.genre ? (
                      <Badge tone="neutral">{track.genre.slug}</Badge>
                    ) : null}
                    <span className="ms-auto flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSideTab('queue')}
                        aria-label={t('player.queue')}
                        title={t('player.queue')}
                        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/20 px-2.5 text-xs font-semibold text-white transition hover:bg-white/10 lg:hidden"
                      >
                        <ListMusic className="h-4 w-4" aria-hidden="true" />
                        <span>{t('player.queue')}</span>
                        <span className="text-white/60">({queue.length})</span>
                      </button>
                      <ShareButton
                        title={track.title}
                        label={t('common.share')}
                        url={
                          podcast
                            ? `/${rtl ? 'ar' : 'en'}/podcasts/episodes/${track.id}`
                            : `/${rtl ? 'ar' : 'en'}/tracks/${track.id}-${track.slug}`
                        }
                      />
                    </span>
                  </div>
                </div>
                {!podcast && (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="hidden sm:block">
                    <AddToPlaylistButton
                      trackId={track.id}
                      label={t('track.addToPlaylist')}
                    />
                    </div>
                    <div className="relative sm:hidden" ref={mobileOptionsRef}>
                      <button
                        type="button"
                        onClick={() => setMobileOptionsOpen((open) => !open)}
                        aria-label={rtl ? 'خيارات الأغنية' : 'Track options'}
                        aria-expanded={mobileOptionsOpen}
                        aria-haspopup="menu"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
                      >
                        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                      </button>
                      {mobileOptionsOpen ? (
                        <div role="menu" className="absolute bottom-full start-0 z-[80] mb-2 flex min-w-[210px] flex-col gap-1 rounded-xl border border-white/20 bg-[#242129] p-2 shadow-2xl">
                          <div role="none" className="[&_button]:w-full [&_button]:justify-start">
                            <AddToPlaylistButton trackId={track.id} label={t('track.addToPlaylist')} />
                          </div>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              usePlayer.setState((state) => ({
                                queue: state.track && !state.queue.some((item) => item.id === state.track?.id)
                                  ? [...state.queue, state.track]
                                  : state.queue,
                              }));
                              setMobileOptionsOpen(false);
                              setControlNotice(rtl ? 'اتضاف لقائمة الانتظار' : 'Added to queue');
                            }}
                            className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-start text-sm text-white hover:bg-white/10"
                          >
                            <ListMusic className="h-4 w-4" />
                            {rtl ? 'أضف لقائمة الانتظار' : 'Add to queue'}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMobileOptionsOpen(false);
                              setSideTab('queue');
                            }}
                            className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-start text-sm text-white hover:bg-white/10"
                          >
                            <ListMusic className="h-4 w-4" />
                            {t('player.queue')}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMobileOptionsOpen(false);
                              setSideTab('similar');
                            }}
                            className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-start text-sm text-white hover:bg-white/10"
                          >
                            <Sparkles className="h-4 w-4" />
                            {rtl ? 'محتوى مشابه' : 'Similar tracks'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <LikeButton
                        trackId={track.id}
                        initialLiked={track.isLiked}
                        initialCount={track.likeCount}
                        compact
                      />
                      <DislikeButton trackId={track.id} />
                    </div>
                    <span className="text-xs text-muted">
                      {formatNumber(track.qualifiedPlays)} {t('common.plays')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {error ? (
              <div
                role="alert"
                className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-danger/25 bg-danger/10 p-3 text-sm text-ink"
              >
                <span>{rtl ? 'تعذّر تشغيل الأغنية.' : 'Playback failed.'}</span>
                <button
                  type="button"
                  onClick={retryPlayback}
                  className="rounded-full border border-white/30 px-4 py-2 font-bold text-neutral-200 hover:bg-white/10"
                >
                  {t('common.retry')}
                </button>
              </div>
            ) : null}
            <div className="mt-2 shrink-0 rounded-[20px] border border-white/[0.13] bg-white/[0.045] px-3 py-2.5 backdrop-blur-xl sm:mt-4 sm:rounded-[22px] sm:px-6 sm:py-4 lg:px-4 lg:py-2.5">
              <input
                type="range"
                min={0}
                max={Math.max(duration, 0.1)}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => seek(Number(event.target.value))}
                className="w-full shadow-[0_0_18px_rgba(255,255,255,0.18)]"
                aria-label={t('player.seek')}
                title={t('player.seek')}
                style={{
                  background: `linear-gradient(to ${rtl ? 'left' : 'right'}, #dedede ${progress}%, rgba(216,194,231,0.28) ${progress}%)`,
                }}
              />
              <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-muted sm:mt-1.5 sm:text-[11px]">
                <span>{formatDuration(currentTime * 1000)}</span>
                <span>{formatDuration(duration * 1000)}</span>
              </div>

              <div className="oddio-mobile-playback-controls relative mt-2 flex min-w-0 items-center justify-center gap-0.5 overflow-visible sm:mt-2 sm:flex-wrap sm:gap-x-3 lg:gap-x-4">
                {podcast ? (
                  <button
                    type="button"
                    onClick={() => seek(Math.max(0, currentTime - 15))}
                    aria-label={rtl ? 'ارجع 15 ثانية' : 'Rewind 15 seconds'}
                    title={rtl ? 'ارجع 15 ثانية' : 'Rewind 15 seconds'}
                    className="relative grid h-11 w-11 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <SkipBack className="h-5 w-5" aria-hidden="true" />
                    <span className="absolute -bottom-0.5 text-[9px] font-bold tabular-nums">
                      15
                    </span>
                  </button>
                ) : (
                  <div className="shrink-0">
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
                      'grid h-11 w-11 place-items-center rounded-full transition hover:bg-white/10 sm:block sm:h-auto sm:w-auto sm:p-2.5',
                      shuffle ? 'text-neutral-200' : 'text-muted',
                    )}
                  >
                    <Shuffle className="h-5 w-5" />
                  </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={previous}
                  aria-label={t('common.previous')}
                  title={t('common.previous')}
                  className="grid h-11 w-11 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <SkipBack className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={isPlaying ? t('common.pause') : t('common.play')}
                  title={isPlaying ? t('common.pause') : t('common.play')}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-transparent transition-transform hover:scale-105 sm:h-20 sm:w-20 lg:h-16 lg:w-16"
                >
                  {isPlaying ? (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[#111111] shadow-[0_0_28px_rgba(255,255,255,.10)] sm:h-[70px] sm:w-[70px] lg:h-[56px] lg:w-[56px]">
                      <Pause className="h-7 w-7 text-[#111111]" fill="currentColor" />
                    </span>
                  ) : (
                    <>
                      <OddioPlayIcon size={54} className="block sm:hidden" />
                      <OddioPlayIcon size={78} className="hidden sm:block lg:hidden" />
                      <OddioPlayIcon size={62} className="hidden lg:block" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => next()}
                  aria-label={t('common.next')}
                  title={t('common.next')}
                  className="grid h-11 w-11 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <SkipForward className="h-6 w-6" />
                </button>
                {podcast ? (
                  <button
                    type="button"
                    onClick={() =>
                      seek(Math.min(duration || currentTime + 30, currentTime + 30))
                    }
                    aria-label={rtl ? 'قدّم 30 ثانية' : 'Forward 30 seconds'}
                    title={rtl ? 'قدّم 30 ثانية' : 'Forward 30 seconds'}
                    className="relative grid h-11 w-11 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <SkipForward className="h-5 w-5" aria-hidden="true" />
                    <span className="absolute -bottom-0.5 text-[9px] font-bold tabular-nums">
                      30
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      cycleRepeat();
                      const mode =
                        repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
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
                    aria-pressed={repeat !== 'off'}
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
                      'rounded-full p-1.5 transition hover:bg-white/10 sm:p-2.5',
                      repeat !== 'off' ? 'text-neutral-200' : 'text-muted',
                    )}
                  >
                    {repeat === 'one' ? (
                      <Repeat1 className="h-5 w-5" />
                    ) : (
                      <Repeat className="h-5 w-5" />
                    )}
                  </button>
                )}
                <div className="flex shrink-0 items-center gap-1.5 sm:ms-2 sm:border-s sm:border-white/15 sm:ps-3">
                  {podcast ? (
                    <label className="relative flex items-center" title={rtl ? 'سرعة التشغيل' : 'Playback speed'}>
                      <span className="sr-only">{rtl ? 'سرعة التشغيل' : 'Playback speed'}</span>
                      <select
                        value={playbackRate}
                        onChange={(event) => setPlaybackRate(Number(event.target.value))}
                        aria-label={rtl ? 'سرعة تشغيل البودكاست' : 'Podcast playback speed'}
                        className="h-10 min-w-[58px] cursor-pointer rounded-full border border-white/20 bg-white/[0.06] px-1.5 text-center text-xs font-bold text-white outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary sm:h-11 sm:min-w-[65px]"
                      >
                        {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                          <option key={rate} value={rate} className="bg-[#18191b]">{rate}x</option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="relative flex items-center gap-1.5" title={rtl ? 'مؤقت النوم' : 'Sleep timer'}>
                    <Moon className={cn('h-4 w-4 shrink-0', sleepUntil ? 'text-primary' : 'text-white/70')} aria-hidden="true" />
                    <span className="sr-only">{rtl ? 'مؤقت النوم' : 'Sleep timer'}</span>
                    <select
                      value={sleepUntil ? 'active' : 'off'}
                      onChange={(event) => setSleepTimer(event.target.value === 'off' ? 0 : Number(event.target.value))}
                      aria-label={rtl ? 'مؤقت إيقاف التشغيل' : 'Sleep timer'}
                      className={cn(
                        'h-10 min-w-[60px] cursor-pointer rounded-full border px-1.5 text-center text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-primary sm:h-11',
                        sleepUntil ? 'border-primary/60 bg-primary/20 text-white' : 'border-white/20 bg-white/[0.06] text-white hover:bg-white/10',
                      )}
                    >
                      <option value="off" className="bg-[#18191b]">{rtl ? 'إيقاف' : 'Off'}</option>
                      {sleepUntil ? <option value="active" disabled className="bg-[#18191b]">{rtl ? 'يعمل' : 'On'}</option> : null}
                      {[5, 15, 30, 60].map((minutes) => (
                        <option key={minutes} value={minutes} className="bg-[#18191b]">{minutes} {rtl ? 'د' : 'min'}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex shrink-0 items-center sm:hidden">
                  <CompactPlayerVolumeControl rtl={rtl} label={t('player.volume')} />
                </div>
                <div className="hidden shrink-0 items-center justify-center gap-2 sm:ms-2 sm:flex sm:w-auto sm:border-s sm:border-white/15 sm:ps-3">
                  <PlayerVolumeControl rtl={rtl} label={t('player.volume')} />
                </div>
              </div>
            </div>
            <div className="mt-2 flex w-full min-w-0 shrink-0 items-center justify-end border-t border-white/10 pt-2.5 sm:hidden">
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[10px] leading-tight text-[#bdbdbd]">
                <input
                  type="checkbox"
                  checked={autoplay}
                  onChange={toggleAutoplay}
                  className="h-4 w-4 shrink-0 rounded border-white/20 bg-black/30 accent-white"
                />
                <span>
                  {podcast
                    ? rtl
                      ? 'تشغيل التالي تلقائيًا'
                      : 'Autoplay next'
                    : rtl
                      ? 'تشغيل مشابه تلقائيًا'
                      : 'Autoplay similar'}
                </span>
              </label>
            </div>
            <div className="mt-4 hidden flex-wrap items-center justify-end gap-4 sm:flex">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={autoplay}
                  onChange={toggleAutoplay}
                  className="h-4 w-4 rounded border-white/20 bg-black/30 accent-primary"
                />
                {t('player.autoplay')}
              </label>
              {!podcast && (
                <label className="flex min-h-11 items-center gap-2 text-xs text-muted">
                  <span>{rtl ? 'التداخل بين الأغاني' : 'Crossfade'}</span>
                  <select
                    aria-label={rtl ? 'مدة تداخل الأغاني' : 'Crossfade duration'}
                    className="rounded-lg border border-white/20 bg-[#18191b] px-2 py-2 text-white"
                    value={crossfadeSeconds}
                    onChange={(event) => setCrossfadeSeconds(Number(event.target.value))}
                  >
                    <option value={0}>{rtl ? 'بدون تداخل' : 'Off'}</option>
                    <option value={3}>3s</option>
                    <option value={5}>5s</option>
                    <option value={8}>8s</option>
                  </select>
                </label>
              )}
            </div>
            {!podcast && (
              <>
                <p className="mt-4 text-center text-[11px] text-muted">
                  {t('player.qualifiedHint')}
                </p>
                <div className="mt-5">
                  <TimedComments key={track.id} trackId={track.id} />
                </div>
              </>
            )}
          </div>

          <aside
            className={cn(
              'min-h-[55dvh] max-h-[calc(100dvh-100px)] flex-col overflow-hidden rounded-[28px] border border-white/[0.13] bg-white/[0.055] p-4 shadow-[0_24px_70px_rgba(0,0,0,.2)] backdrop-blur-[28px] lg:flex lg:min-h-[470px] lg:max-h-[calc(100vh-175px)]',
              sideTab === 'queue' || sideTab === 'lyrics' ? 'flex' : 'hidden lg:flex',
            )}
            aria-label={
              sideTab === 'lyrics'
                ? rtl
                  ? 'كلمات الأغنية'
                  : 'Lyrics'
                : sideTab === 'queue'
                  ? t('player.queue')
                  : rtl
                    ? 'اقتراحات مشابهة'
                    : 'Similar content'
            }
          >
            <div className="mb-3 flex items-center justify-between gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label={t('player.minimize')}
                title={t('player.minimize')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <ChevronDown className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setSideTab('similar')}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                aria-label={rtl ? 'الرجوع للمشغل' : 'Back to player'}
              >
                <ListMusic className="h-5 w-5" aria-hidden="true" />
                {rtl ? 'الرجوع للمشغل' : 'Back to player'}
              </button>
            </div>
            <div
              className={cn(
                'mb-5 grid gap-1 rounded-2xl bg-white/[0.06] p-1.5',
                podcast ? 'grid-cols-2' : 'grid-cols-3',
              )}
              role="tablist"
              aria-label={rtl ? 'أقسام المشغل' : 'Player panels'}
              onKeyDown={(event) => {
                if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key))
                  return;
                const tabs = Array.from(
                  event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
                );
                const position = tabs.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                if (position < 0 || !tabs.length) return;
                event.preventDefault();
                const delta = (event.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1);
                const target =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? tabs.length - 1
                      : (position + delta + tabs.length) % tabs.length;
                tabs[target]?.focus();
                tabs[target]?.click();
              }}
            >
              {!podcast && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={sideTab === 'lyrics'}
                  id="oddio-tab-lyrics"
                  aria-controls="oddio-player-panel"
                  tabIndex={sideTab === 'lyrics' ? 0 : -1}
                  onClick={() => setSideTab('lyrics')}
                  className={cn(
                    'flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-xs font-bold transition sm:gap-2 sm:px-3 sm:text-sm',
                    sideTab === 'lyrics'
                      ? 'bg-white/15 text-neutral-200 ring-1 ring-white/25'
                      : 'text-muted hover:bg-white/5 hover:text-ink',
                  )}
                >
                  <Mic2 className="h-4 w-4" /> {rtl ? 'الكلمات' : 'Lyrics'}
                </button>
              )}
              <button
                type="button"
                role="tab"
                aria-selected={sideTab === 'queue'}
                id="oddio-tab-queue"
                aria-controls="oddio-player-panel"
                tabIndex={sideTab === 'queue' ? 0 : -1}
                onClick={() => setSideTab('queue')}
                className={cn(
                  'flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-xs font-bold transition sm:gap-2 sm:px-3 sm:text-sm',
                  sideTab === 'queue'
                    ? 'bg-white/15 text-neutral-200 ring-1 ring-white/25'
                    : 'text-muted hover:bg-white/5 hover:text-ink',
                )}
              >
                <ListMusic className="h-4 w-4" /> {t('player.queue')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sideTab === 'similar'}
                id="oddio-tab-similar"
                aria-controls="oddio-player-panel"
                tabIndex={sideTab === 'similar' ? 0 : -1}
                onClick={() => setSideTab('similar')}
                className={cn(
                  'flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-xs font-bold transition sm:gap-2 sm:px-3 sm:text-sm',
                  sideTab === 'similar'
                    ? 'bg-white/15 text-neutral-200 ring-1 ring-white/25'
                    : 'text-muted hover:bg-white/5 hover:text-ink',
                )}
              >
                <Sparkles className="h-4 w-4" />
                {rtl ? 'مشابهة' : 'Similar'}
              </button>
            </div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[.15em] text-[#c7c7c7]">
              {sideTab === 'similar'
                ? rtl
                  ? 'محتوى يشبه اللي بتسمعه'
                  : 'MORE LIKE THIS'
                : sideTab === 'queue'
                  ? t('player.queue')
                  : rtl
                    ? 'كلمات الأغنية'
                    : 'LYRICS'}
            </p>
            {sideTab === 'similar' ? (
              <div
                id="oddio-player-panel"
                role="tabpanel"
                aria-labelledby="oddio-tab-similar"
                className="min-h-0 flex-1 overflow-y-auto"
              >
                <SimilarPlayerPanel
                  trackId={track.id}
                  podcast={podcast}
                  rtl={rtl}
                  active={expanded && sideTab === 'similar'}
                />
              </div>
            ) : sideTab === 'lyrics' && !podcast ? (
              <div
                id="oddio-player-panel"
                role="tabpanel"
                aria-labelledby="oddio-tab-lyrics"
                aria-label={rtl ? 'كلمات الأغنية' : 'Synchronized lyrics'}
                className="scroll-thin min-h-0 flex-1 overflow-y-auto"
              >
                {lyricsLoading ? (
                  <p className="rounded-xl border border-white/10 p-5 text-center text-sm text-muted">
                    {rtl ? 'جارٍ تحميل الكلمات…' : 'Loading lyrics…'}
                  </p>
                ) : cues.length > 0 ? (
                  <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
                    <span className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-neutral-300/70">
                      {rtl ? 'كلمات متزامنة' : 'LIVE LYRICS'}
                    </span>
                    <p
                      key={activeCue}
                      dir="auto"
                      className="text-balance text-center text-2xl font-extrabold leading-relaxed text-ink transition-all duration-300"
                    >
                      {activeCue >= 0 ? cues[activeCue]?.text : '♪'}
                    </p>
                  </div>
                ) : (
                  <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 px-6 text-center">
                    <Mic2 className="h-8 w-8 text-neutral-300/70" />
                    <p className="text-sm font-bold text-ink">
                      {rtl ? 'الكلمات غير متاحة حاليًا' : 'Lyrics aren’t available yet'}
                    </p>
                    <p className="text-xs leading-relaxed text-muted">
                      {rtl
                        ? 'اضغط على الزرار علشان الـAI يستخرج الكلمات مرة واحدة ويحفظها.'
                        : 'Generate timed lyrics once and save them for everyone.'}
                    </p>
                    <button
                      type="button"
                      onClick={generateLyrics}
                      disabled={generatingLyrics}
                      className="rounded-xl bg-white/20 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {generatingLyrics
                        ? rtl
                          ? 'جاري التوليد…'
                          : 'Generating…'
                        : '✨ Generate Lyrics'}
                    </button>
                    {lyricsMessage ? (
                      <p role="status" className="text-xs text-neutral-200">
                        {lyricsMessage}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <div
                id="oddio-player-panel"
                role="tabpanel"
                aria-labelledby="oddio-tab-queue"
                aria-label={t('player.queue')}
                title={t('player.queue')}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-ink">
                    {t('player.queue')}{' '}
                    <span className="text-xs font-normal text-muted">
                      ({queue.length})
                    </span>
                  </h2>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {queue.length > 0 ? <SaveQueueAsPlaylist /> : null}
                    {canUndoQueue ? (
                      <button
                        type="button"
                        onClick={undoQueue}
                        className="min-h-10 rounded-full border border-primary/40 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        aria-label={
                          rtl
                            ? 'تراجع عن آخر تعديل في قائمة الانتظار'
                            : 'Undo last queue edit'
                        }
                      >
                        {rtl ? 'تراجع' : 'Undo'}
                      </button>
                    ) : null}
                    {queue.length > 0 ? (
                      <button
                        type="button"
                        onClick={clearQueue}
                        className="grid h-11 w-11 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        aria-label={t('player.clearQueue')}
                        title={t('player.clearQueue')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/30 bg-white/15 p-3">
                  <Equalizer
                    bars={3}
                    paused={!isPlaying}
                    className="h-5 shrink-0 text-neutral-200"
                  />
                  <Artwork
                    title={track.title}
                    url={track.artwork.url}
                    accent={track.artwork.accent}
                    className="h-10 w-10 shrink-0"
                    rounded="rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase text-neutral-200">
                      {rtl ? 'بتشتغل دلوقتي' : 'Now playing'}
                    </span>
                    <span className="block truncate text-sm font-bold text-white">
                      {track.title}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {track.artist?.name ?? '—'}
                    </span>
                  </div>
                </div>
                {queue.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-muted">
                    {t('player.emptyQueue')}
                  </p>
                ) : (
                  <DragReorderList
                    items={queue}
                    getId={(item) => item.id}
                    locale={rtl ? 'ar' : 'en'}
                    onMove={reorderQueue}
                    className="scroll-thin -mx-1 min-h-0 flex-1 overflow-y-auto px-1"
                    renderItem={(item, index) => (
                      <div className="group flex min-w-0 items-center gap-1 rounded-xl px-1 py-1.5 hover:bg-white/5">
                        <button
                          type="button"
                          onClick={() => jumpTo(item.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          <Artwork
                            title={item.title}
                            url={item.artwork.url}
                            accent={item.artwork.accent}
                            className="h-10 w-10 shrink-0"
                            rounded="rounded-lg"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-ink">
                              {item.title}
                            </span>
                            <span className="block truncate text-xs text-muted">
                              {item.artist?.name ?? '—'}
                            </span>
                          </span>
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveInQueue(item.id, 'up')}
                            aria-label={
                              rtl ? `حرّك ${item.title} لفوق` : `Move ${item.title} up`
                            }
                            title={rtl ? 'لأعلى' : 'Move up'}
                            className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-25"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={index === queue.length - 1}
                            onClick={() => moveInQueue(item.id, 'down')}
                            aria-label={
                              rtl ? `حرّك ${item.title} لتحت` : `Move ${item.title} down`
                            }
                            title={rtl ? 'لأسفل' : 'Move down'}
                            className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-25"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromQueue(item.id)}
                            aria-label={t('player.removeFromQueue')}
                            title={t('player.removeFromQueue')}
                            className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  />
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
