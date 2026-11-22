'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Download, Instagram, Pause, Play, X } from 'lucide-react';
import type { CatalogTrack } from '@/lib/data/queries';
import { isPodcastPlayback } from '@/lib/podcast-playback';
import { canonicalOddioShareUrl } from '@/lib/share-url';
import { useLocale } from '@/i18n/use-translator';
import { usePlayer } from '@/lib/player-store';

const STORY_WIDTH = 720;
const STORY_HEIGHT = 1280;
const MAX_CLIP_SECONDS = 30;


type LyricCue = { start: number; end: number; text: string };

function parseStorySrt(value: string): LyricCue[] {
  return value.replace(/\r/g, '').trim().split(/\n\s*\n/).flatMap((block) => {
    const lines = block.split('\n');
    const index = lines.findIndex((line) => line.includes('-->'));
    if (index < 0) return [];
    const parseTime = (input: string) => {
      const match = input.trim().match(/(?:(\d+):)?(\d+):(\d+)[,.](\d+)/);
      return match
        ? Number(match[1] || 0) * 3600 + Number(match[2]) * 60 + Number(match[3])
          + Number((match[4] ?? '0').padEnd(3, '0').slice(0, 3)) / 1000
        : NaN;
    };
    const [from, to] = (lines[index] ?? '').split('-->');
    const start = parseTime(from || '');
    const end = parseTime(to || '');
    const text = lines.slice(index + 1).join(' ').replace(/<[^>]*>/g, '').trim();
    return Number.isFinite(start) && Number.isFinite(end) && end > start && text
      ? [{ start, end, text }] : [];
  });
}

function formatTime(value: number): string {
  const total = Math.max(0, Math.floor(value));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
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
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#291039');
  bg.addColorStop(0.46, '#10121e');
  bg.addColorStop(1, '#07090f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  const halo = ctx.createRadialGradient(360, 450, 20, 360, 450, 500);
  halo.addColorStop(0, 'rgba(171,74,245,.32)');
  halo.addColorStop(1, 'rgba(171,74,245,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);

  const x = 85, y = 255, size = 550;
  ctx.save();
  ctx.shadowColor = 'rgba(191,77,255,.38)';
  ctx.shadowBlur = 65;
  ctx.fillStyle = '#1d1534';
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
    const w = cover.naturalWidth * scale, h = cover.naturalHeight * scale;
    ctx.drawImage(cover, x + (size - w) / 2, y + (size - h) / 2, w, h);
  } else {
    const glow = ctx.createRadialGradient(360, 480, 30, 360, 480, 390);
    glow.addColorStop(0, '#11d4f8');
    glow.addColorStop(0.48, '#8422ba');
    glow.addColorStop(1, '#1d102c');
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, size, size);
    ctx.beginPath();
    ctx.strokeStyle = '#ffffffbd';
    ctx.lineWidth = 9;
    for (let p = 0; p <= 360; p += 5) {
      const xx = 180 + p;
      const yy = 535 + Math.sin(p / 43) * 75 * Math.sin(Math.PI * p / 360);
      if (p === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#b961ff';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(x - 5, y - 5, size + 10, size + 10, 30);
  ctx.stroke();

  ctx.fillStyle = '#d9b7ff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText(isPodcastPlayback(track) ? 'ODDIO  /  PODCAST' : 'ODDIO  /  MUSIC', 360, 158);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 42px Arial, sans-serif';
  const titleLines = wrapText(ctx, track.title, 590, 2);
  // The right-to-left title is drawn in the center with the same alignment.
  titleLines.forEach((line, i) => ctx.fillText(line, 360, 900 + i * 52));
  ctx.fillStyle = '#c6b7d5';
  ctx.font = '27px Arial, sans-serif';
  const artist = track.artist?.name || 'Oddio';
  ctx.fillText(artist.slice(0, 65), 360, 1015);

  if (lyric) {
    ctx.fillStyle = 'rgba(10,7,20,.87)';
    ctx.beginPath();
    ctx.roundRect(50, 947, 620, 110, 20);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial, sans-serif';
    wrapText(ctx, lyric, 570, 2).forEach((line, i) => ctx.fillText(line, 360, 987 + i * 37));
  }

  // Animated audio bars and excerpt progress.
  for (let i = 0; i < 37; i++) {
    const phase = seconds * 7 + i * 0.71;
    const amplitude = 10 + Math.abs(Math.sin(phase)) * (14 + Math.sin(i * 0.37) ** 2 * 32);
    ctx.fillStyle = i / 37 <= seconds / Math.max(length, 1) ? '#e5b0ff' : '#77588d';
    ctx.beginPath();
    ctx.roundRect(117 + i * 13.1, 1083 - amplitude / 2, 7, amplitude, 4);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.fillText(ar ? 'اسمع التسجيل كامل على Oddio' : 'LISTEN TO THE FULL TRACK ON ODDIO', 360, 1180);
  ctx.font = '24px Arial, sans-serif';
  ctx.fillStyle = '#b7a6cc';
  ctx.fillText('oddio.online  •  LINK IN STORY', 360, 1222);
}

async function coverImage(url: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => resolve(null), 4000);
    img.onload = () => { window.clearTimeout(timer); resolve(img); };
    img.onerror = () => { window.clearTimeout(timer); resolve(null); };
    img.src = url;
  });
}

export function StoryClipComposer({ track, onClose }: {
  track: CatalogTrack;
  onClose: () => void;
}) {
  const ar = useLocale() === 'ar';
  const currentSeconds = usePlayer((state) => state.track?.id === track.id ? state.currentTime : 0);
  const [measuredDuration, setMeasuredDuration] = useState(0);
  const [loadingAudio, setLoadingAudio] = useState(true);
  const [lyricCues, setLyricCues] = useState<LyricCue[]>([]);
  const duration = measuredDuration || Math.max(0, (track.durationMs || 0) / 1000);
  const [start, setStart] = useState(() => Math.min(Math.floor(currentSeconds), Math.max(0, duration - MAX_CLIP_SECONDS)));
  const [clipLength, setClipLength] = useState(15);
  const [working, setWorking] = useState(false);
  const [percent, setPercent] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const previewRef = useRef<HTMLAudioElement | null>(null);
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
  const effectiveLength = Math.min(clipLength, Math.max(1, duration - start));
  const lyricAt = (position: number) => lyricCues.find((cue) => cue.start <= position && position < cue.end)?.text;

  useEffect(() => {
    let active = true;
    const audio = new Audio(audioSrc);
    audio.preload = 'metadata';
    const onDuration = () => {
      if (!active) return;
      if (Number.isFinite(audio.duration) && audio.duration > 0) setMeasuredDuration(audio.duration);
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
    let active = true;
    fetch(`/api/tracks/${track.id}/synced-lyrics`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && typeof data?.srt === 'string') setLyricCues(parseStorySrt(data.srt));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [podcast, track.id]);

  useEffect(() => () => {
    cancelRef.current?.();
    previewRef.current?.pause();
    if (fileUrl.current) URL.revokeObjectURL(fileUrl.current);
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(ar ? 'انسخ الرابط يدويًا من الحقل الموجود تحت' : 'Copy the link manually from the field below.');
    }
  };

  const togglePreview = async () => {
    if (previewRef.current) {
      previewRef.current.pause();
      previewRef.current.src = '';
      previewRef.current = null;
      setPreviewing(false);
      return;
    }
    const audio = new Audio(audioSrc);
    previewRef.current = audio;
    audio.preload = 'auto';
    try {
      await new Promise<void>((resolve, reject) => {
        audio.onloadedmetadata = () => resolve();
        audio.onerror = () => reject(new Error('Could not load audio preview'));
        audio.load();
      });
      audio.currentTime = start;
      audio.ontimeupdate = () => {
        if (audio.currentTime >= start + effectiveLength) {
          audio.pause();
          setPreviewing(false);
          previewRef.current = null;
        }
      };
      await audio.play();
      setPreviewing(true);
    } catch {
      setPreviewing(false);
      previewRef.current = null;
      setError(ar ? 'تعذر تشغيل معاينة المقطع' : 'Could not preview this excerpt.');
    }
  };

  async function createClip() {
    setError('');
    setWorking(true);
    setPercent(0);
    setFile(null);
    if (previewRef.current) {
      previewRef.current.pause();
      previewRef.current = null;
      setPreviewing(false);
    }
    let audio: HTMLAudioElement | null = null;
    let context: AudioContext | null = null;
    let recorder: MediaRecorder | null = null;
    let raf = 0;
    let timeout = 0;
    let stream: MediaStream | null = null;
    try {
      if (typeof MediaRecorder === 'undefined'
        || typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
        throw new Error(ar ? 'المتصفح ده مش بيدعم تسجيل فيديو الستوري. جرّب متصفح أحدث.' : 'This browser cannot record a Story video. Try another modern browser.');
      }
      context = new AudioContext();
      await context.resume();
      const canvas = document.createElement('canvas');
      canvas.width = STORY_WIDTH;
      canvas.height = STORY_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      const cover = await coverImage(track.artwork.url);
      audio = document.createElement('audio');
      audio.preload = 'auto';
      audio.src = audioSrc;
      await new Promise<void>((resolve, reject) => {
        audio!.onloadedmetadata = () => resolve();
        audio!.onerror = () => reject(new Error('Could not load the audio source'));
        audio!.load();
      });
      audio.currentTime = start;
      await new Promise<void>((resolve) => {
        if (!audio!.seeking && Math.abs(audio!.currentTime - start) < 0.15) resolve();
        else {
          const timer = setTimeout(resolve, 1200);
          audio!.addEventListener('seeked', () => { clearTimeout(timer); resolve(); }, { once: true });
        }
      });
      const source = context.createMediaElementSource(audio);
      const destination = context.createMediaStreamDestination();
      source.connect(destination);
      drawStory(ctx, track, cover, 0, effectiveLength, ar, lyricAt(start));
      stream = canvas.captureStream(24);
      for (const item of destination.stream.getAudioTracks()) stream.addTrack(item);
      const mime = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error('No compatible video encoder in this browser');
      recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_200_000 });
      const chunks: Blob[] = [];
      const finalFile = new Promise<File>((resolve, reject) => {
        recorder!.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        recorder!.onerror = () => reject(new Error('Video encoding failed'));
        recorder!.onstop = () => {
          if (!chunks.length) return reject(new Error('The video could not be recorded'));
          const type = mime.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';
          resolve(new File(chunks, `oddio-story-${track.id.slice(0,8)}.${type === 'video/mp4' ? 'mp4' : 'webm'}`, { type }));
        };
      });
      const startTime = performance.now();
      let finished = false;
      const stop = () => {
        if (finished) return;
        finished = true;
        if (recorder?.state === 'recording') recorder.stop();
        audio?.pause();
      };
      cancelRef.current = stop;
      const draw = () => {
        const seconds = Math.min(effectiveLength, (performance.now() - startTime) / 1000);
        drawStory(ctx, track, cover, seconds, effectiveLength, ar, lyricAt(start + seconds));
        setPercent(Math.round(100 * seconds / effectiveLength));
        if (seconds >= effectiveLength) stop();
        else raf = requestAnimationFrame(draw);
      };
      recorder.start(500);
      try { await audio.play(); } catch {
        stop();
        throw new Error(ar ? 'المتصفح منع تشغيل الصوت أثناء التسجيل' : 'Browser blocked audio playback while recording.');
      }
      raf = requestAnimationFrame(draw);
      timeout = window.setTimeout(stop, (effectiveLength + 3) * 1000);
      const generated = await finalFile;
      if (generated.size < 1000) throw new Error('The recorded file is empty');
      setFile(generated);
      setPercent(100);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create a Story clip.');
    } finally {
      if (raf) cancelAnimationFrame(raf);
      if (timeout) clearTimeout(timeout);
      if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
      if (stream) stream.getTracks().forEach((item) => item.stop());
      if (recorder?.state === 'recording') recorder.stop();
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
    // Prepare the URL for Instagram's native Link sticker before opening the
    // system share sheet. Never claim that a sticker was added automatically.
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
    } catch {
      // Copy link remains available as an explicit separate action.
    }
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
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-3 backdrop-blur-lg sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !working) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="oddio-story-clip-title" className="flex max-h-[92dvh] w-full max-w-[780px] flex-col overflow-y-auto rounded-3xl border border-white/20 bg-[#1b1725] p-4 text-white shadow-2xl sm:p-6" dir={ar ? 'rtl' : 'ltr'}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 id="oddio-story-clip-title" className="text-xl font-black">{ar ? 'شارك مقطع على Instagram Story' : 'Share an Instagram Story clip'}</h2>
            <p className="mt-1 text-xs text-white/60">{ar ? 'اختار جزء صغير من التسجيل وصدّره كفيديو رأسي بالصوت.' : 'Choose a short audio excerpt and export a vertical Story video.'}</p>
          </div>
          <button type="button" disabled={working} onClick={onClose} aria-label={ar ? 'إغلاق' : 'Close'} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-5 sm:grid-cols-[190px_minmax(0,1fr)]">
          <div className="relative mx-auto aspect-[9/16] w-[155px] max-w-full overflow-hidden rounded-2xl border border-[#ac65df]/50 bg-[radial-gradient(circle_at_50%_35%,#5b2692,#120d20_65%,#08090e)] p-3 shadow-lg sm:w-full">
            <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-[#ddbaff]">ODDIO / {podcast ? 'PODCAST' : 'MUSIC'}</p>
            {track.artwork.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={track.artwork.url} alt="" className="mx-auto aspect-square w-full rounded-xl border border-white/15 object-cover" />
            ) : <div className="mx-auto aspect-square w-full rounded-xl bg-[#7438ae]" />}
            <p dir="auto" className="mt-3 line-clamp-3 text-center text-sm font-black">{track.title}</p>
            <p dir="auto" className="mt-1 truncate text-center text-[10px] text-white/60">{track.artist?.name}</p>
            <div className="absolute inset-x-2 bottom-3 text-center text-[10px] font-bold">oddio.online<br /><span className="text-[#d8b3f7]">LINK IN STORY</span></div>
          </div>
          <div className="min-w-0 space-y-4">
            <div>
              <label htmlFor="oddio-clip-start" className="mb-2 block text-sm font-semibold">{ar ? 'بداية المقطع' : 'Clip start'} — {formatTime(start)}</label>
              <input id="oddio-clip-start" type="range" min={0} max={Math.max(0, Math.floor(duration - 1))} value={start} step={1} disabled={working}
                onChange={(event) => { setStart(Number(event.target.value)); setFile(null); }} className="w-full cursor-pointer accent-[#c16af1]" />
              <div className="flex justify-between text-[11px] text-white/50" dir="ltr"><span>0:00</span><span>{loadingAudio ? '…' : formatTime(duration)}</span></div>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="oddio-clip-length" className="text-sm font-semibold">{ar ? 'المدة' : 'Duration'}</label>
              <select id="oddio-clip-length" value={clipLength} disabled={working} onChange={(event) => { setClipLength(Number(event.target.value)); setFile(null); }}
                className="rounded-xl border border-white/20 bg-[#30263d] px-3 py-2 text-sm text-white">
                <option value={5}>5 {ar ? 'ثواني' : 'seconds'}</option><option value={10}>10 {ar ? 'ثواني' : 'seconds'}</option><option value={15}>15 {ar ? 'ثانية' : 'seconds'}</option><option value={30}>30 {ar ? 'ثانية' : 'seconds'}</option>
              </select>
              <button type="button" onClick={togglePreview} disabled={working || duration <= 0} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 px-3 text-xs hover:bg-white/10">
                {previewing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {previewing ? (ar ? 'إيقاف' : 'Stop') : (ar ? 'معاينة الصوت' : 'Preview audio')}
              </button>
            </div>
            <button type="button" disabled={working || duration <= 0} onClick={createClip}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#b460ed] px-4 text-sm font-bold text-[#160a20] transition hover:bg-[#ce91f5] disabled:cursor-not-allowed disabled:opacity-50">
              <Instagram className="h-5 w-5" /> {working ? (ar ? `جاري تجهيز الفيديو… ${percent}%` : `Recording… ${percent}%`) : (ar ? 'جهّز فيديو الستوري' : 'Create Story video')}
            </button>
            {file ? (
              <div className="space-y-2">
                <p className="text-xs text-[#ddbaff]">{file.type === 'video/mp4'
                  ? (ar ? 'فيديو MP4 جاهز للمشاركة.' : 'MP4 video is ready to share.')
                  : (ar ? 'الفيديو بصيغة WebM. بعض نسخ Instagram تحتاج تحويله لـ MP4 قبل الرفع.' : 'Video is WebM; Instagram may require converting it to MP4 before upload.')}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={shareFile} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-bold text-[#21152e]"><Instagram className="h-4 w-4" />{ar ? 'مشاركة الفيديو' : 'Share video'}</button>
                  <button type="button" onClick={download} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/25 px-3 text-xs"><Download className="h-4 w-4" />{ar ? 'تنزيل الفيديو' : 'Download video'}</button>
                </div>
              </div>
            ) : null}
            {error ? <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-xs text-red-200">{error}</p> : null}
            <div className="space-y-2 rounded-xl border border-white/15 bg-white/[0.045] p-3">
              <h3 className="text-sm font-bold">{ar ? 'الرابط اللي هيتحط على الستوري' : 'Clickable Story link'}</h3>
              <input readOnly value={typeof window === 'undefined' ? sharePath : link()} onFocus={(event) => event.currentTarget.select()}
                aria-label={ar ? 'رابط التسجيل الكامل' : 'Full audio URL'} dir="ltr" className="w-full min-w-0 rounded-lg border border-white/15 bg-black/30 p-2 text-xs text-white" />
              <button type="button" onClick={copyLink} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#bb7be3]/50 px-3 text-xs font-bold hover:bg-white/10">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? (ar ? 'اتنسخ' : 'Copied') : (ar ? 'انسخ الرابط' : 'Copy link')}
              </button>
              <p className="text-xs leading-5 text-white/65">{ar
                ? 'افتح الفيديو في Instagram Story، واضغط Stickers ثم Link والصق الرابط. رابط قابل للضغط ما ينفعش نضيفه تلقائيًا من الموقع بسبب قيود Instagram.'
                : 'Open the video in Instagram Stories, then tap Stickers → Link and paste this URL. Instagram does not let websites insert a tappable Link sticker automatically.'}</p>
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
