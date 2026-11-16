'use client';

import Link from 'next/link';
import { OddioPlayIcon } from '@/components/ui/OddioPlayIcon';
import { isPodcastPlayback } from '@/lib/podcast-playback';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ListMusic,
  Mic2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { usePlayer } from '@/lib/player-store';
import { useLocale, useT } from '@/i18n/use-translator';
import { Artwork } from '@/components/ui/Artwork';
import { AddToPlaylistButton } from '@/components/playlists/AddToPlaylistButton';
import { Badge } from '@/components/ui/Badge';
import { LikeButton } from '@/components/community/LikeButton';
import { DislikeButton } from '@/components/community/DislikeButton';
import { TimedComments } from '@/components/community/TimedComments';
import { ShareButton } from '@/components/community/ShareButton';
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const [controlNotice, setControlNotice] = useState('');
  useEffect(() => {
    if (!controlNotice) return;
    const timer = window.setTimeout(() => setControlNotice(''), 2000);
    return () => window.clearTimeout(timer);
  }, [controlNotice]);
  const [sideTab, setSideTab] = useState<'lyrics' | 'queue'>('lyrics');
  useEffect(() => {
    const showQueue = () => setSideTab('queue');
    window.addEventListener('oddio:open-queue', showQueue);
    return () => window.removeEventListener('oddio:open-queue', showQueue);
  }, []);
  const rtl = useLocale() === 'ar';
  const expanded = usePlayer((state) => state.expanded);
  const track = usePlayer((state) => state.track);
  const podcast = isPodcastPlayback(track);
  const hasTrack = Boolean(track);
  const queue = usePlayer((state) => state.queue);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const error = usePlayer((state) => state.error);
  const retryPlayback = usePlayer((state) => state.retryPlayback);
  const currentTime = usePlayer((state) => state.currentTime);
  const duration = usePlayer((state) => state.duration);
  const volume = usePlayer((state) => state.volume);
  const muted = usePlayer((state) => state.muted);
  const repeat = usePlayer((state) => state.repeat);
  const shuffle = usePlayer((state) => state.shuffle);
  const autoplay = usePlayer((state) => state.autoplay);
  const crossfadeSeconds = usePlayer((state) => state.crossfadeSeconds);
  const setCrossfadeSeconds = usePlayer((state) => state.setCrossfadeSeconds);
  const setExpanded = usePlayer((state) => state.setExpanded);
  const toggle = usePlayer((state) => state.toggle);
  const next = usePlayer((state) => state.next);
  const previous = usePlayer((state) => state.previous);
  const seek = usePlayer((state) => state.seek);
  const setVolume = usePlayer((state) => state.setVolume);
  const toggleMute = usePlayer((state) => state.toggleMute);
  const cycleRepeat = usePlayer((state) => state.cycleRepeat);
  const toggleShuffle = usePlayer((state) => state.toggleShuffle);
  const toggleAutoplay = usePlayer((state) => state.toggleAutoplay);
  const jumpTo = usePlayer((state) => state.jumpTo);
  const removeFromQueue = usePlayer((state) => state.removeFromQueue);
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
      className="fixed inset-0 z-[60] w-full max-w-full overflow-x-clip overflow-y-auto overscroll-x-none bg-background scroll-thin"
      role="dialog"
      aria-modal="true"
      aria-label={t('player.fullPlayer')}
      title={t('player.fullPlayer')}
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{
          background: `radial-gradient(900px 600px at 15% 0%, ${accent}55, transparent 60%), radial-gradient(800px 600px at 90% 100%, rgba(65,217,255,0.15), transparent 60%)`,
        }}
      />
      {controlNotice ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 z-[90] -translate-x-1/2 whitespace-nowrap rounded-full border border-primary/40 bg-[#242027] px-4 py-2 text-sm font-bold text-white shadow-xl"
        >
          {controlNotice}
        </div>
      ) : null}
      <div className="relative mx-auto w-full min-w-0 max-w-6xl overflow-x-clip px-4 py-5 sm:px-8 sm:py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted">
            <ListMusic className="h-4 w-4" />
            {t('player.nowPlaying')}
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

        <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="min-w-0">
            <div className="relative mx-auto max-w-[min(100%,44vh)] sm:max-w-md lg:max-w-md">
              <div
                aria-hidden="true"
                className="absolute -inset-6 rounded-[2.5rem] opacity-50 blur-3xl"
                style={{
                  background: `radial-gradient(circle, ${accent}, transparent 70%)`,
                }}
              />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 p-1.5">
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
                  className="pointer-events-none absolute -inset-24 animate-spin-slow opacity-40 [background:conic-gradient(from_0deg,transparent_0deg,rgba(157,92,255,0.5)_70deg,transparent_140deg,rgba(65,217,255,0.4)_240deg,transparent_300deg)]"
                />
                {!podcast && mobileLyricsOpen ? (
                  <div
                    id="oddio-mobile-lyrics"
                    className="absolute inset-1.5 z-40 flex flex-col rounded-[1.35rem] bg-[#130e20]/95 p-4 backdrop-blur-xl lg:hidden"
                  >
                    <div className="mb-2 flex items-center justify-between text-sm font-bold text-white">
                      <span>🎤 {rtl ? 'كلمات الأغنية' : 'Lyrics'}</span>
                      <button
                        type="button"
                        onClick={() => setMobileLyricsOpen(false)}
                        className="rounded-lg bg-white/10 px-3 py-1.5"
                      >
                        {rtl ? 'إغلاق' : 'Close'}
                      </button>
                    </div>
                    <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
                      {lyricsLoading ? (
                        <p className="text-sm text-white/70">
                          {rtl ? 'جاري التحميل…' : 'Loading…'}
                        </p>
                      ) : cues.length ? (
                        <div
                          aria-live="off"
                          className="flex w-full flex-col items-center justify-center px-2 text-center"
                        >
                          <div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-fuchsia-300/70">
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
                            className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
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
              {!podcast && <div className="relative z-30 mt-3 flex items-center justify-center lg:hidden">
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
                      ? 'border-fuchsia-400/50 bg-gradient-to-r from-violet-600/80 to-fuchsia-600/80 text-white shadow-fuchsia-500/20'
                      : 'border-white/15 bg-white/[0.08] text-white/90 hover:border-fuchsia-400/40 hover:bg-white/[0.14]',
                  )}
                >
                  <Mic2 className="h-4 w-4 text-fuchsia-200" />
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
                      mobileLyricsOpen ? 'bg-cyan-300' : 'bg-fuchsia-400/70',
                    )}
                  />
                </button>
              </div>}
              <div className="mt-3 hidden h-8 items-end justify-center gap-1 sm:flex">
                <Equalizer
                  bars={28}
                  paused={!isPlaying}
                  className="h-full w-full max-w-xs text-primary/70"
                />
              </div>
            </div>
            <div className="mt-6 flex min-w-0 items-start justify-between gap-2 sm:gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black tracking-tight text-ink sm:text-3xl">
                  {track.title}
                </h1>
                {track.artist ? (
                  <Link
                    href={podcast ? `/${rtl ? 'ar' : 'en'}/podcasts/shows/${track.artist.slug}` : `/${rtl ? 'ar' : 'en'}/artists/${track.artist.slug}`}
                    className="text-sm text-muted transition hover:text-ink"
                  >
                    {track.artist.name}
                  </Link>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone="cyan">{track.qualityLabel}</Badge>
                  {!podcast && <Badge tone="primary">
                    {track.productionType === 'fully_ai'
                      ? t('track.fullyAi')
                      : t('track.aiAssisted')}
                  </Badge>}
                  {track.genre ? <Badge tone="neutral">{track.genre.slug}</Badge> : null}
                </div>
              </div>
              {!podcast && <div className="flex shrink-0 flex-col items-end gap-2">
                <AddToPlaylistButton
                  trackId={track.id}
                  label={t('track.addToPlaylist')}
                />
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
              </div>}
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
                  className="rounded-full border border-primary/50 px-4 py-2 font-bold text-primary hover:bg-primary/10"
                >
                  {t('common.retry')}
                </button>
              </div>
            ) : null}
            <div className="mt-4">
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
                  background: `linear-gradient(to ${rtl ? 'left' : 'right'}, #fff ${progress}%, rgba(255,255,255,0.2) ${progress}%)`,
                }}
              />
              <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-muted">
                <span>{formatDuration(currentTime * 1000)}</span>
                <span>{formatDuration(duration * 1000)}</span>
              </div>
            </div>

            <div className="mt-4 flex min-w-0 items-center justify-center gap-1 sm:gap-5">
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
                  'rounded-full p-2.5 transition hover:bg-white/10',
                  shuffle ? 'text-primary' : 'text-muted',
                )}
              >
                <Shuffle className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={previous}
                aria-label={t('common.previous')}
                title={t('common.previous')}
                className="rounded-full p-2.5 text-muted transition hover:bg-white/10 hover:text-ink"
              >
                <SkipBack className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={toggle}
                aria-label={isPlaying ? t('common.pause') : t('common.play')}
                title={isPlaying ? t('common.pause') : t('common.play')}
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-transparent transition-transform hover:scale-105 sm:h-28 sm:w-28"
              >
                {isPlaying ? (
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-background sm:h-24 sm:w-24">
                    <Pause className="h-7 w-7" fill="currentColor" />
                  </span>
                ) : (
                  <span className="scale-[0.7] sm:scale-100">
                    <OddioPlayIcon size={112} />
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => next()}
                aria-label={t('common.next')}
                title={t('common.next')}
                className="rounded-full p-2.5 text-muted transition hover:bg-white/10 hover:text-ink"
              >
                <SkipForward className="h-6 w-6" />
              </button>
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
                  'rounded-full p-2.5 transition hover:bg-white/10',
                  repeat !== 'off' ? 'text-primary' : 'text-muted',
                )}
              >
                {repeat === 'one' ? (
                  <Repeat1 className="h-5 w-5" />
                ) : (
                  <Repeat className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
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
                  className="w-28"
                  aria-label={t('player.volume')}
                  title={t('player.volume')}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={autoplay}
                  onChange={toggleAutoplay}
                  className="h-4 w-4 rounded border-white/20 bg-black/30 accent-primary"
                />
                {t('player.autoplay')}
              </label>
              {!podcast && <label className="flex min-h-11 items-center gap-2 text-xs text-muted">
                <span>{rtl ? 'التداخل بين الأغاني' : 'Crossfade'}</span>
                <select
                  aria-label={rtl ? 'مدة تداخل الأغاني' : 'Crossfade duration'}
                  className="rounded-lg border border-white/20 bg-[#211d27] px-2 py-2 text-white"
                  value={crossfadeSeconds}
                  onChange={(event) => setCrossfadeSeconds(Number(event.target.value))}
                >
                  <option value={0}>{rtl ? 'بدون تداخل' : 'Off'}</option>
                  <option value={3}>3s</option>
                  <option value={5}>5s</option>
                  <option value={8}>8s</option>
                </select>
              </label>}
              <ShareButton title={track.title} label={t('common.share')} />
            </div>
            {!podcast && <><p className="mt-4 text-center text-[11px] text-muted">{t('player.qualifiedHint')}</p>
            <div className="mt-5"><TimedComments key={track.id} trackId={track.id} /></div></>}
          </div>

          {!podcast && <aside
            className="card flex min-h-[350px] max-h-[75vh] flex-col p-4"
            aria-label={sideTab === 'lyrics' ? 'Lyrics' : t('player.queue')}
          >
            <div
              className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-black/25 p-1"
              role="tablist"
              aria-label="Player panels"
            >
              <button
                type="button"
                role="tab"
                aria-selected={sideTab === 'lyrics'}
                onClick={() => setSideTab('lyrics')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition',
                  sideTab === 'lyrics'
                    ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                    : 'text-muted hover:bg-white/5 hover:text-ink',
                )}
              >
                <Mic2 className="h-4 w-4" /> {rtl ? 'الكلمات' : 'Lyrics'}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sideTab === 'queue'}
                onClick={() => setSideTab('queue')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition',
                  sideTab === 'queue'
                    ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                    : 'text-muted hover:bg-white/5 hover:text-ink',
                )}
              >
                <ListMusic className="h-4 w-4" /> {t('player.queue')}
              </button>
            </div>
            {sideTab === 'lyrics' ? (
              <div
                role="tabpanel"
                aria-label={rtl ? 'كلمات الأغنية' : 'Synchronized lyrics'}
                className="scroll-thin min-h-0 flex-1 overflow-y-auto"
              >
                {lyricsLoading ? (
                  <p className="rounded-xl border border-white/10 p-5 text-center text-sm text-muted">
                    {rtl ? 'جارٍ تحميل الكلمات…' : 'Loading lyrics…'}
                  </p>
                ) : cues.length > 0 ? (
                  <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
                    <span className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-primary/70">
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
                    <Mic2 className="h-8 w-8 text-primary/70" />
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
                      className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {generatingLyrics
                        ? rtl
                          ? 'جاري التوليد…'
                          : 'Generating…'
                        : '✨ Generate Lyrics'}
                    </button>
                    {lyricsMessage ? (
                      <p role="status" className="text-xs text-primary">
                        {lyricsMessage}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <div
                role="tabpanel"
                aria-label={t('player.queue')}
                title={t('player.queue')}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-ink">
                    {t('player.queue')}{' '}
                    <span className="text-xs font-normal text-muted">
                      ({queue.length})
                    </span>
                  </h2>
                  {queue.length > 0 ? (
                    <button
                      type="button"
                      onClick={clearQueue}
                      className="rounded-full p-1.5 text-muted transition hover:bg-white/10 hover:text-ink"
                      aria-label={t('player.clearQueue')}
                      title={t('player.clearQueue')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-primary/50 bg-primary/15 p-3">
                  <Equalizer
                    bars={3}
                    paused={!isPlaying}
                    className="h-5 shrink-0 text-primary"
                  />
                  <Artwork
                    title={track.title}
                    url={track.artwork.url}
                    accent={track.artwork.accent}
                    className="h-10 w-10 shrink-0"
                    rounded="rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase text-primary">
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
                  <ul className="scroll-thin -mx-1 space-y-1 overflow-y-auto px-1">
                    {queue.map((item, index) => (
                      <li
                        key={`${item.id}-${index}`}
                        className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/5"
                      >
                        <button
                          type="button"
                          onClick={() => jumpTo(item.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-start"
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
                        <button
                          type="button"
                          onClick={() => removeFromQueue(item.id)}
                          className="rounded-full p-1.5 text-muted opacity-0 transition hover:bg-white/10 hover:text-ink group-hover:opacity-100"
                          aria-label={t('player.removeFromQueue')}
                          title={t('player.removeFromQueue')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </aside>}
        </div>
      </div>
    </div>
  );
}
