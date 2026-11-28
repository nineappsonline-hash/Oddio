'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Copy,
  Download,
  Instagram,
  Link2,
  Pause,
  Play,
  Share2,
  X,
} from 'lucide-react';
import type { CatalogTrack } from '@/lib/data/queries';
import { isPodcastPlayback } from '@/lib/podcast-playback';
import { canonicalOddioShareUrl } from '@/lib/share-url';
import { describeStoryVideo, selectStoryVideoType } from '@/lib/story-video-format';
import { useLocale } from '@/i18n/use-translator';
import { usePlayer } from '@/lib/player-store';
import styles from './StoryClipComposer.module.css';

const STORY_WIDTH = 720;
const STORY_HEIGHT = 1280;

type LyricCue = { start: number; end: number; text: string };

function parseStorySrt(value: string): LyricCue[] {
  return value
    .replace(/\r/g, '')
    .trim()
    .split(/\n\s*\n/)
    .flatMap((block) => {
      const lines = block.split('\n');
      const index = lines.findIndex((line) => line.includes('-->'));
      if (index < 0) return [];
      const parseTime = (input: string) => {
        const match = input.trim().match(/(?:(\d+):)?(\d+):(\d+)[,.](\d+)/);
        return match
          ? Number(match[1] || 0) * 3600 +
              Number(match[2]) * 60 +
              Number(match[3]) +
              Number((match[4] ?? '0').padEnd(3, '0').slice(0, 3)) / 1000
          : NaN;
      };
      const [from, to] = (lines[index] ?? '').split('-->');
      const start = parseTime(from || '');
      const end = parseTime(to || '');
      const text = lines
        .slice(index + 1)
        .join(' ')
        .replace(/<[^>]*>/g, '')
        .trim();
      return Number.isFinite(start) && Number.isFinite(end) && end > start && text
        ? [{ start, end, text }]
        : [];
    });
}

function formatTime(value: number): string {
  const total = Math.max(0, Math.floor(value));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length >= maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function drawStory(
  ctx: CanvasRenderingContext2D,
  track: CatalogTrack,
  cover: HTMLImageElement | null,
  seconds: number,
  length: number,
  ar: boolean,
  lyric?: string,
) {
  const width = STORY_WIDTH,
    height = STORY_HEIGHT;
  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#174348');
  bg.addColorStop(0.46, '#12272b');
  bg.addColorStop(1, '#080e11');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  const halo = ctx.createRadialGradient(360, 450, 20, 360, 450, 500);
  halo.addColorStop(0, 'rgba(121,224,202,.22)');
  halo.addColorStop(1, 'rgba(121,224,202,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);

  const x = 105,
    y = 218,
    size = 510;
  ctx.save();
  ctx.shadowColor = 'rgba(121,224,202,.27)';
  ctx.shadowBlur = 65;
  ctx.fillStyle = '#142b2d';
  ctx.beginPath();
  ctx.roundRect(x - 6, y - 6, size + 12, size + 12, 30);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 26);
  ctx.clip();
  if (cover && cover.complete && cover.naturalWidth) {
    const scale = Math.max(size / cover.naturalWidth, size / cover.naturalHeight);
    const w = cover.naturalWidth * scale,
      h = cover.naturalHeight * scale;
    ctx.drawImage(cover, x + (size - w) / 2, y + (size - h) / 2, w, h);
  } else {
    const glow = ctx.createRadialGradient(360, 480, 30, 360, 480, 390);
    glow.addColorStop(0, '#11d4f8');
    glow.addColorStop(0.48, '#2a6363');
    glow.addColorStop(1, '#112428');
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, size, size);
    ctx.beginPath();
    ctx.strokeStyle = '#ffffffbd';
    ctx.lineWidth = 9;
    for (let p = 0; p <= 360; p += 5) {
      const xx = 180 + p;
      const yy = 535 + Math.sin(p / 43) * 75 * Math.sin((Math.PI * p) / 360);
      if (p === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#74a9a2';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(x - 5, y - 5, size + 10, size + 10, 30);
  ctx.stroke();

  ctx.fillStyle = '#b4efe2';
  ctx.textAlign = 'center';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText(
    isPodcastPlayback(track) ? 'ODDIO  /  PODCAST' : 'ODDIO  /  MUSIC',
    360,
    158,
  );

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 42px Arial, sans-serif';
  const titleLines = wrapText(ctx, track.title, 590, 2);
  // The right-to-left title is drawn in the center with the same alignment.
  titleLines.forEach((line, i) => ctx.fillText(line, 360, 827 + i * 52));
  ctx.fillStyle = '#b9cecf';
  ctx.font = '27px Arial, sans-serif';
  const artist = track.artist?.name || 'Oddio';
  ctx.fillText(artist.slice(0, 65), 360, 922, 580);

  if (lyric) {
    ctx.fillStyle = 'rgba(8,17,20,.93)';
    ctx.beginPath();
    ctx.roundRect(50, 947, 620, 110, 20);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial, sans-serif';
    wrapText(ctx, lyric, 570, 2).forEach((line, i) =>
      ctx.fillText(line, 360, 987 + i * 37),
    );
  }

  // Animated audio bars and excerpt progress.
  for (let i = 0; i < 37; i++) {
    const phase = seconds * 7 + i * 0.71;
    const amplitude =
      10 + Math.abs(Math.sin(phase)) * (14 + Math.sin(i * 0.37) ** 2 * 32);
    ctx.fillStyle = i / 37 <= seconds / Math.max(length, 1) ? '#a7ebdc' : '#44696b';
    ctx.beginPath();
    ctx.roundRect(117 + i * 13.1, 1083 - amplitude / 2, 7, amplitude, 4);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.fillText(
    ar ? 'اسمع التسجيل كامل على Oddio' : 'LISTEN TO THE FULL TRACK ON ODDIO',
    360,
    1180,
  );
  ctx.font = '24px Arial, sans-serif';
  ctx.fillStyle = '#adcac4';
  ctx.fillText('oddio.online', 360, 1222);
}

async function coverImage(
  url: string | null | undefined,
): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => resolve(null), 4000);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

export function StoryClipComposer({
  track,
  onClose,
}: {
  track: CatalogTrack;
  onClose: () => void;
}) {
  const ar = useLocale() === 'ar';
  const currentSeconds = usePlayer((state) =>
    state.track?.id === track.id ? state.currentTime : 0,
  );
  const [measuredDuration, setMeasuredDuration] = useState(0);
  const [loadingAudio, setLoadingAudio] = useState(true);
  const lyricsRef = useRef<Promise<LyricCue[]> | null>(null);
  const duration = measuredDuration || Math.max(0, (track.durationMs || 0) / 1000);
  const [start, setStart] = useState(() =>
    Math.min(Math.floor(currentSeconds), Math.max(0, Math.floor(duration - 1))),
  );
  const [clipLength, setClipLength] = useState(15);
  const [working, setWorking] = useState(false);
  const [percent, setPercent] = useState(0);
  const [storyVideo, setStoryVideo] = useState<{
    file: File;
    compatible: boolean;
  } | null>(null);
  const file = storyVideo?.file;
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  const coverRef = useRef<Promise<HTMLImageElement | null> | null>(null);
  const [cover, setCover] = useState<HTMLImageElement | null>(null);
  const [previewLyrics, setPreviewLyrics] = useState<LyricCue[]>([]);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const shareRef = useRef<HTMLButtonElement>(null);
  const linkDetailsRef = useRef<HTMLDetailsElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const previewRef = useRef<(() => void) | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const fileUrl = useRef<string | null>(null);
  const podcast = isPodcastPlayback(track);
  const sharePath = podcast
    ? `/${ar ? 'ar' : 'en'}/podcasts/episodes/${track.id}`
    : `/${ar ? 'ar' : 'en'}/tracks/${track.id}-${track.slug}`;

  const link = () => {
    const url = new URL(canonicalOddioShareUrl(sharePath, window.location.href));
    url.searchParams.set('utm_source', 'instagram');
    url.searchParams.set('utm_medium', 'story');
    url.searchParams.set('utm_campaign', 'oddio_clip');
    return url.toString();
  };
  const audioSrc = `/api/story-audio/${podcast ? 'podcast' : 'track'}/${track.id}`;
  const maxStart = Math.max(0, Math.floor(duration - 1));
  const clipStart = Math.min(start, maxStart);
  const effectiveLength = Math.min(clipLength, Math.max(0, duration - clipStart));

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
      clearTimeout(copyTimer.current);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const promise = coverImage(track.artwork.url).then(
      (image) => image ?? coverImage('/oddio-gradient-play-logo.png'),
    );
    coverRef.current = promise;
    void promise.then((image) => {
      if (active) setCover(image);
    });
    return () => {
      active = false;
    };
  }, [track.artwork.url]);

  useEffect(() => {
    const ctx = previewCanvas.current?.getContext('2d');
    if (!ctx) return;
    const cue = previewLyrics.find(
      (item) =>
        item.start <= clipStart + previewTime && item.end > clipStart + previewTime,
    );
    ctx.save();
    ctx.scale(0.5, 0.5);
    drawStory(ctx, track, cover, previewTime, effectiveLength, ar, cue?.text);
    ctx.restore();
  }, [track, cover, previewTime, effectiveLength, ar, clipStart, previewLyrics]);

  useEffect(() => {
    let active = true;
    const audio = new Audio(audioSrc);
    audio.preload = 'metadata';
    const onDuration = () => {
      if (!active) return;
      if (Number.isFinite(audio.duration) && audio.duration > 0)
        setMeasuredDuration(audio.duration);
      setLoadingAudio(false);
    };
    const onError = () => {
      if (active) {
        setLoadingAudio(false);
        setError(ar ? 'تعذر تحميل ملف الصوت' : 'Could not load the audio file.');
      }
    };
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('error', onError);
    audio.load();
    return () => {
      active = false;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, [audioSrc, ar]);

  useEffect(() => {
    if (podcast) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8_000);
    lyricsRef.current = fetch(`/api/tracks/${track.id}/synced-lyrics`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) =>
        typeof data?.data?.srt === 'string' ? parseStorySrt(data.data.srt) : [],
      )
      .catch(() => [])
      .then((cues) => {
        if (!controller.signal.aborted) setPreviewLyrics(cues);
        return cues;
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
      lyricsRef.current = null;
    };
  }, [podcast, track.id]);

  useEffect(() => {
    if (file) shareRef.current?.focus({ preventScroll: true });
  }, [file]);

  useEffect(
    () => () => {
      cancelRef.current?.();
      previewRef.current?.();
      if (fileUrl.current) URL.revokeObjectURL(fileUrl.current);
    },
    [],
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      if (linkDetailsRef.current) linkDetailsRef.current.open = true;
      linkInputRef.current?.focus();
    }
  };

  const stopPreview = () => {
    previewRef.current?.();
    setPreviewing(false);
    setPreviewTime(0);
  };

  const updateStart = (value: number) => {
    stopPreview();
    setStart(Math.max(0, Math.min(Math.floor(value), maxStart)));
    setStoryVideo(null);
  };

  const togglePreview = () => {
    if (previewRef.current) {
      stopPreview();
      return;
    }
    setError('');
    if (usePlayer.getState().isPlaying) usePlayer.getState().setPlaying(false);
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = audioSrc;
    // Set the initial position and call play in the tap, including on cold media.
    audio.currentTime = clipStart;
    const dispose = () => {
      previewRef.current = null;
      clearTimeout(timer);
      audio.onended = null;
      audio.onerror = null;
      audio.ontimeupdate = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
    const onError = () => {
      if (previewRef.current !== dispose) return;
      stopPreview();
      setError(ar ? 'تعذر تشغيل معاينة المقطع' : 'Could not preview this excerpt.');
    };
    const timer = window.setTimeout(onError, 15_000);
    previewRef.current = dispose;
    audio.onended = stopPreview;
    audio.onerror = onError;
    audio.ontimeupdate = () => {
      if (audio.currentTime >= clipStart + effectiveLength) stopPreview();
      else setPreviewTime(Math.max(0, audio.currentTime - clipStart));
    };
    setPreviewing(true);
    void audio.play().then(() => clearTimeout(timer), onError);
  };

  async function createClip() {
    setError('');
    setWorking(true);
    setPercent(0);
    setStoryVideo(null);
    stopPreview();
    if (usePlayer.getState().isPlaying) usePlayer.getState().setPlaying(false);
    let audio: HTMLAudioElement | null = null;
    let context: AudioContext | null = null;
    let recorder: MediaRecorder | null = null;
    let raf = 0;
    let timeout = 0;
    let stream: MediaStream | null = null;
    try {
      if (
        typeof MediaRecorder === 'undefined' ||
        typeof HTMLCanvasElement.prototype.captureStream !== 'function'
      ) {
        throw new Error(
          ar
            ? 'المتصفح ده مش بيدعم تسجيل فيديو الستوري. جرّب متصفح أحدث.'
            : 'This browser cannot record a Story video. Try another modern browser.',
        );
      }
      context = new AudioContext();
      await context.resume();
      const canvas = document.createElement('canvas');
      canvas.width = STORY_WIDTH;
      canvas.height = STORY_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      const cover = await (coverRef.current ?? coverImage(track.artwork.url));
      audio = document.createElement('audio');
      audio.preload = 'auto';
      audio.src = audioSrc;
      const recordingAudio = audio;
      await new Promise<void>((resolve, reject) => {
        const settle = (loaded: boolean) => {
          clearTimeout(timer);
          recordingAudio.onloadedmetadata = null;
          recordingAudio.onerror = null;
          if (loaded) resolve();
          else reject(new Error('Could not load the audio source'));
        };
        const timer = window.setTimeout(() => settle(false), 15_000);
        recordingAudio.onloadedmetadata = () => settle(true);
        recordingAudio.onerror = () => settle(false);
        recordingAudio.load();
      });
      audio.currentTime = clipStart;
      if (audio.seeking || Math.abs(audio.currentTime - clipStart) >= 0.15) {
        await new Promise<void>((resolve, reject) => {
          const onSeek = () => {
            clearTimeout(timer);
            if (Math.abs(recordingAudio.currentTime - clipStart) < 0.15) resolve();
            else reject(new Error('Could not reach the selected clip start'));
          };
          const timer = window.setTimeout(() => {
            recordingAudio.removeEventListener('seeked', onSeek);
            reject(new Error('Could not reach the selected clip start'));
          }, 12_000);
          recordingAudio.addEventListener('seeked', onSeek, { once: true });
        });
      }
      const lyricCues = await lyricsRef.current;
      const lyricAt = (position: number) =>
        lyricCues?.find((cue) => cue.start <= position && position < cue.end)?.text;
      const source = context.createMediaElementSource(audio);
      const destination = context.createMediaStreamDestination();
      source.connect(destination);
      drawStory(ctx, track, cover, 0, effectiveLength, ar, lyricAt(clipStart));
      stream = canvas.captureStream(24);
      for (const item of destination.stream.getAudioTracks()) stream.addTrack(item);
      const mime = selectStoryVideoType((type) => MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error('No compatible video encoder in this browser');
      recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 2_200_000,
      });
      const chunks: Blob[] = [];
      const videoRecorder = recorder;
      let reportedMime = '';
      const generated = await new Promise<{ file: File; compatible: boolean }>(
        (resolve, reject) => {
          let finished = false;
          const stop = (failure?: Error) => {
            if (finished) return;
            finished = true;
            if (raf) cancelAnimationFrame(raf);
            recordingAudio.onplaying = null;
            recordingAudio.onwaiting = null;
            recordingAudio.onended = null;
            recordingAudio.onerror = null;
            if (failure) reject(failure);
            if (videoRecorder.state !== 'inactive') videoRecorder.stop();
            recordingAudio.pause();
          };
          const failed = () =>
            new Error(
              ar
                ? 'تعذر تسجيل المقطع كاملًا. جرّب تاني.'
                : 'Could not record the full excerpt. Try again.',
            );
          cancelRef.current = () => stop(failed());
          const target = Math.min(clipStart + effectiveLength, recordingAudio.duration);
          const length = target - clipStart;
          if (!(length > 0)) {
            stop(failed());
            return;
          }
          const draw = () => {
            if (finished) return;
            const position = Math.min(target, recordingAudio.currentTime);
            const seconds = Math.max(0, position - clipStart);
            drawStory(ctx, track, cover, seconds, length, ar, lyricAt(position));
            setPercent(Math.round((100 * seconds) / length));
            if (position >= target) stop();
            else raf = requestAnimationFrame(draw);
          };
          videoRecorder.ondataavailable = (event) => {
            if (event.data.size) {
              if (chunks.length === 0)
                reportedMime = videoRecorder.mimeType || reportedMime;
              chunks.push(event.data);
            }
          };
          videoRecorder.onerror = () => stop(new Error('Video encoding failed'));
          videoRecorder.onstop = () => {
            if (!chunks.length)
              return reject(new Error('The video could not be recorded'));
            try {
              const { type, extension, compatible } = describeStoryVideo(
                chunks[0]?.type || '',
                reportedMime,
                mime,
              );
              resolve({
                file: new File(
                  chunks,
                  `oddio-story-${track.id.slice(0, 8)}.${extension}`,
                  { type },
                ),
                compatible,
              });
            } catch (cause) {
              reject(cause);
            }
          };
          recordingAudio.onplaying = () => {
            try {
              if (videoRecorder.state === 'inactive') {
                videoRecorder.start(500);
                reportedMime = videoRecorder.mimeType;
                draw();
              } else if (videoRecorder.state === 'paused') {
                videoRecorder.resume();
              }
            } catch {
              stop(new Error('Video encoding failed'));
            }
          };
          recordingAudio.onwaiting = () => {
            if (videoRecorder.state === 'recording') videoRecorder.pause();
          };
          recordingAudio.onended = () =>
            stop(recordingAudio.currentTime >= target - 0.05 ? undefined : failed());
          recordingAudio.onerror = () => stop(failed());
          timeout = window.setTimeout(() => stop(failed()), (length + 18) * 1000);
          void recordingAudio.play().catch(() => {
            stop(
              new Error(
                ar
                  ? 'المتصفح منع تشغيل الصوت أثناء التسجيل'
                  : 'Browser blocked audio playback while recording.',
              ),
            );
          });
        },
      );
      if (generated.file.size < 1000) throw new Error('The recorded file is empty');
      setStoryVideo(generated);
      setPercent(100);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create a Story clip.');
    } finally {
      if (raf) cancelAnimationFrame(raf);
      if (timeout) clearTimeout(timeout);
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
      if (stream) stream.getTracks().forEach((item) => item.stop());
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      if (context) void context.close();
      cancelRef.current = null;
      setWorking(false);
    }
  }

  function download() {
    if (!file) return;
    if (fileUrl.current) URL.revokeObjectURL(fileUrl.current);
    const url = URL.createObjectURL(file);
    fileUrl.current = url;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
  }

  async function shareFile() {
    if (!file) return;
    // Start native sharing in the tap; the link sticker uses Copy link.
    try {
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: track.title });
      } else {
        download();
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') download();
    }
  }

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !working) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="oddio-story-clip-title"
        className={styles.studio}
        dir={ar ? 'rtl' : 'ltr'}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !working) {
            event.stopPropagation();
            onClose();
          }
          if (event.key !== 'Tab') return;
          const controls = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not([disabled]), input:not([disabled]), summary',
            ),
          ].filter((item) => item.getClientRects().length > 0);
          const edge = event.shiftKey ? controls[0] : controls.at(-1);
          if (document.activeElement === edge) {
            event.preventDefault();
            (event.shiftKey ? controls.at(-1) : controls[0])?.focus();
          }
        }}
      >
        <header className={styles.header}>
          <span className={styles.mark}>
            <Instagram size={22} />
          </span>
          <div>
            <p className={styles.eyebrow}>ODDIO / SHARE STUDIO</p>
            <h2 id="oddio-story-clip-title">
              {ar ? 'جهّز Instagram Story' : 'Create an Instagram Story'}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            disabled={working}
            onClick={onClose}
            aria-label={ar ? 'إغلاق' : 'Close'}
            className={styles.close}
          >
            <X size={19} />
          </button>
        </header>

        <div className={styles.body}>
          <figure className={styles.preview}>
            <div className={styles.previewFrame}>
              <canvas ref={previewCanvas} width={360} height={640} aria-hidden="true" />
            </div>
            <figcaption>
              {ar ? 'معاينة الستوري' : 'Story preview'} <span>9:16</span>
            </figcaption>
          </figure>

          <div className={styles.editor}>
            <div className={styles.track}>
              <span className={styles.eyebrow}>
                {podcast ? (ar ? 'بودكاست' : 'PODCAST') : ar ? 'موسيقى' : 'MUSIC'}
              </span>
              <p dir="auto">{track.title}</p>
              <span dir="auto">{track.artist?.name || 'Oddio'}</span>
            </div>
            <div className={styles.rangeCard}>
              <div className={styles.fieldHeader}>
                <label htmlFor="oddio-clip-start">
                  {ar ? 'اختار المقطع' : 'Choose your excerpt'}
                </label>
                <output
                  htmlFor="oddio-clip-start"
                  dir="ltr"
                  className={styles.timePill}
                  data-testid="story-selection"
                >
                  {formatTime(clipStart)} –{' '}
                  {formatTime(Math.min(duration, clipStart + effectiveLength))}
                </output>
              </div>
              <input
                id="oddio-clip-start"
                type="range"
                min={0}
                max={maxStart}
                value={clipStart}
                step={1}
                disabled={working || maxStart === 0}
                aria-valuetext={formatTime(clipStart)}
                onChange={(event) => updateStart(Number(event.target.value))}
                dir="ltr"
                className={styles.slider}
              />
              <div className={styles.ruler} dir="ltr">
                <span>0:00</span>
                <span>{loadingAudio ? '…' : formatTime(duration)}</span>
              </div>
              <div className={styles.shortcuts}>
                <button
                  type="button"
                  disabled={working || clipStart <= 0}
                  onClick={() => updateStart(clipStart - 5)}
                  aria-label={ar ? 'ارجع ٥ ثواني' : 'Back 5 seconds'}
                >
                  −5s
                </button>
                <button
                  type="button"
                  disabled={working || clipStart >= maxStart}
                  onClick={() => updateStart(clipStart + 5)}
                  aria-label={ar ? 'قدّم ٥ ثواني' : 'Forward 5 seconds'}
                >
                  +5s
                </button>
                <button
                  type="button"
                  disabled={working || duration <= 0}
                  onClick={() => updateStart(currentSeconds)}
                >
                  {ar ? 'من مكان التشغيل' : 'Use playhead'}
                </button>
              </div>
            </div>
            <fieldset className={styles.durations}>
              <legend>{ar ? 'مدة الستوري' : 'Story length'}</legend>
              {[5, 10, 15, 30].map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  aria-label={ar ? `${seconds} ثانية` : `${seconds} seconds`}
                  aria-pressed={clipLength === seconds}
                  disabled={working || duration <= 0}
                  onClick={() => {
                    if (seconds === clipLength) return;
                    stopPreview();
                    setClipLength(seconds);
                    setStoryVideo(null);
                  }}
                >
                  {seconds}
                  {ar ? ' ث' : 's'}
                </button>
              ))}
            </fieldset>
            {error ? (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <footer className={styles.footer}>
          {working ? (
            <div
              className={styles.progress}
              role="progressbar"
              aria-label={ar ? 'تجهيز الستوري' : 'Preparing Story video'}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <span style={{ width: `${percent}%` }} />
            </div>
          ) : null}
          {file ? (
            <>
              <p className={styles.ready} role="status">
                <Check size={15} />
                {storyVideo?.compatible
                  ? ar
                    ? 'الفيديو جاهز للمشاركة بصيغة MP4.'
                    : 'MP4 with H.264 video and AAC audio, ready to share.'
                  : ar
                    ? 'الفيديو جاهز للتنزيل. إنستجرام ممكن ما يقبلش الترميز ده.'
                    : 'Video ready to download. Instagram may not accept its encoding.'}
              </p>
              <div className={styles.actions}>
                <button
                  ref={shareRef}
                  type="button"
                  onClick={shareFile}
                  className={styles.primary}
                >
                  <Share2 size={17} />
                  {ar ? 'مشاركة الفيديو' : 'Share video'}
                </button>
                <button type="button" onClick={download} className={styles.secondary}>
                  <Download size={16} />
                  {ar ? 'تنزيل الفيديو' : 'Download video'}
                </button>
              </div>
            </>
          ) : (
            <div className={styles.actions}>
              <button
                type="button"
                disabled={working || duration <= 0}
                onClick={createClip}
                className={styles.primary}
              >
                <Instagram size={18} />
                {working
                  ? ar
                    ? `جاري التجهيز… ${percent}%`
                    : `Recording… ${percent}%`
                  : ar
                    ? 'جهّز فيديو الستوري'
                    : 'Create Story video'}
              </button>
              <button
                type="button"
                onClick={togglePreview}
                disabled={working || duration <= 0}
                className={styles.secondary}
              >
                {previewing ? <Pause size={16} /> : <Play size={16} />}
                {previewing
                  ? ar
                    ? 'إيقاف'
                    : 'Stop'
                  : ar
                    ? 'معاينة الصوت'
                    : 'Preview audio'}
              </button>
            </div>
          )}
          <div className={styles.linkRow}>
            <div>
              <Link2 size={15} />
              <span>
                {ar ? 'في إنستجرام: الملصقات ← Link' : 'In Instagram: Stickers → Link'}
              </span>
            </div>
            <button type="button" onClick={copyLink}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? (ar ? 'اتنسخ' : 'Copied') : ar ? 'انسخ الرابط' : 'Copy link'}
            </button>
          </div>
          <details ref={linkDetailsRef} className={styles.linkDetails}>
            <summary>{ar ? 'عرض الرابط' : 'Show link'}</summary>
            <input
              readOnly
              value={link()}
              ref={linkInputRef}
              onFocus={(event) => event.currentTarget.select()}
              aria-label={ar ? 'رابط التسجيل الكامل' : 'Full audio URL'}
              dir="ltr"
            />
          </details>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
