'use client';

import Link from 'next/link';
import { OddioPlayIcon } from '@/components/ui/OddioPlayIcon';
import { useEffect, useMemo, useState } from 'react';
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
  const [controlNotice, setControlNotice] = useState('');
  useEffect(() => {
    if (!controlNotice) return;
    const timer = window.setTimeout(() => setControlNotice(''), 2000);
    return () => window.clearTimeout(timer);
  }, [controlNotice]);
  const [sideTab, setSideTab] = useState<'lyrics' | 'queue'>('lyrics');
  const rtl = useLocale() === 'ar';
  const expanded = usePlayer((state) => state.expanded);
  const track = usePlayer((state) => state.track);
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

  useEffect(() => {
    if (!track?.id) {
      setSrt(null);
      setPlainLyrics(null);
      setLyricsLoading(false);
      return;
    }
    const controller = new AbortController();
    setSrt(null);
    setPlainLyrics(null);
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
  const cues = useMemo(() => (srt ? parseSrt(srt) : []), [srt]);
  const activeCue = cues.findIndex(
    (cue) => currentTime >= cue.start && currentTime < cue.end,
  );
  if (!expanded || !track) return null;

  const accent = track.artwork.accent;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-background scroll-thin"
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
      <div className="relative mx-auto max-w-6xl px-4 py-5 sm:px-8 sm:py-8">
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

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div>
            <div className="relative mx-auto max-w-md">
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
                  url={track.artwork.url}
                  accent={accent}
                  className="aspect-square w-full shadow-glow"
                  rounded="rounded-[1.35rem]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-24 animate-spin-slow opacity-40 [background:conic-gradient(from_0deg,transparent_0deg,rgba(157,92,255,0.5)_70deg,transparent_140deg,rgba(65,217,255,0.4)_240deg,transparent_300deg)]"
                />
              </div>
              <div className="mt-5 flex h-8 items-end justify-center gap-1">
                <Equalizer
                  bars={28}
                  paused={!isPlaying}
                  className="h-full w-full max-w-xs text-primary/70"
                />
              </div>
            </div>
            <div className="mt-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black tracking-tight text-ink sm:text-3xl">
                  {track.title}
                </h1>
                {track.artist ? (
                  <Link
                    href={`/${rtl ? 'ar' : 'en'}/artists/${track.artist.slug}`}
                    className="text-sm text-muted transition hover:text-ink"
                  >
                    {track.artist.name}
                  </Link>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone="cyan">{track.qualityLabel}</Badge>
                  <Badge tone="primary">
                    {track.productionType === 'fully_ai'
                      ? t('track.fullyAi')
                      : t('track.aiAssisted')}
                  </Badge>
                  {track.genre ? <Badge tone="neutral">{track.genre.slug}</Badge> : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <AddToPlaylistButton
                  trackId={track.id}
                  label={t('track.addToPlaylist')}
                />
                <LikeButton
                  trackId={track.id}
                  initialLiked={track.isLiked}
                  initialCount={track.likeCount}
                  compact
                />
                <span className="text-xs text-muted">
                  {formatNumber(track.qualifiedPlays)} {t('common.plays')}
                </span>
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
                  className="rounded-full border border-primary/50 px-4 py-2 font-bold text-primary hover:bg-primary/10"
                >
                  {t('common.retry')}
                </button>
              </div>
            ) : null}
            <div className="mt-6">
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

            <div className="mt-4 flex items-center justify-center gap-3 sm:gap-5">
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
                className={
                  isPlaying
                    ? 'flex h-24 w-24 items-center justify-center rounded-full bg-white text-background transition hover:scale-105'
                    : 'flex h-28 w-28 items-center justify-center rounded-full bg-transparent transition hover:scale-105'
                }
              >
                {isPlaying ? (
                  <Pause className="h-7 w-7" fill="currentColor" />
                ) : (
                  <OddioPlayIcon size={124} />
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
              <ShareButton title={track.title} label={t('common.share')} />
            </div>
            <p className="mt-4 text-center text-[11px] text-muted">
              {t('player.qualifiedHint')}
            </p>
          </div>

          <aside
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
                  <div className="space-y-2 py-2">
                    {cues.map((cue, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => seek(cue.start)}
                        aria-current={index === activeCue ? 'true' : undefined}
                        className={cn(
                          'block w-full rounded-xl px-4 py-3 text-start text-base leading-relaxed transition hover:bg-white/10',
                          index === activeCue
                            ? 'bg-primary/15 font-black text-primary ring-1 ring-primary/20'
                            : 'text-muted',
                        )}
                      >
                        {cue.text}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 px-6 text-center">
                    <Mic2 className="h-8 w-8 text-primary/70" />
                    <p className="text-sm font-bold text-ink">
                      {rtl ? 'الكلمات غير متاحة حاليًا' : 'Lyrics aren’t available yet'}
                    </p>
                    <p className="text-xs leading-relaxed text-muted">
                      {rtl
                        ? 'هتظهر هنا بعد ما الفنان يرفع ملف SRT ويوافق عليه الأدمن.'
                        : 'Synced lyrics will appear here once the artist uploads an SRT file and an admin approves it.'}
                    </p>
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
          </aside>
        </div>
      </div>
    </div>
  );
}
