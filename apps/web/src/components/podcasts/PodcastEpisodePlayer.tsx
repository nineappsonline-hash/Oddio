'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, RotateCcw, RotateCw, Gauge, Volume2 } from 'lucide-react';
import { usePlayer } from '@/lib/player-store';
import { OddioPlayIcon } from '@/components/ui/OddioPlayIcon';

function displayTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const total = Math.floor(value), hours = Math.floor(total / 3600);
  const minutes = Math.floor(total % 3600 / 60), seconds = total % 60;
  return hours ? `${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}` : `${minutes}:${String(seconds).padStart(2,'0')}`;
}

export function PodcastEpisodePlayer({
  episodeId, initialDuration, locale,
}: { episodeId: string; initialDuration: number; locale: 'en' | 'ar' }) {
  const ref = useRef<HTMLAudioElement>(null);
  const setMusicPlaying = usePlayer((s) => s.setPlaying);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [speed, setSpeed] = useState(1);
  const [message, setMessage] = useState('');
  const [volume, setVolume] = useState(1);
  const ar = locale === 'ar';

  useEffect(() => {
    const audio = ref.current;
    return () => { if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); } };
  }, [episodeId]);

  async function toggle() {
    const audio = ref.current;
    if (!audio) return;
    if (!audio.paused) { audio.pause(); return; }
    setMusicPlaying(false);
    setMessage('');
    try { await audio.play(); } catch { setMessage(ar ? 'تعذّر تشغيل الحلقة. حاول مرة تانية.' : 'Unable to play this episode. Please try again.'); }
  }

  function skip(seconds: number) {
    const audio = ref.current;
    if (!audio) return;
    const maximum = Number.isFinite(audio.duration) ? audio.duration : duration;
    audio.currentTime = Math.max(0, Math.min(maximum || Number.MAX_SAFE_INTEGER, audio.currentTime + seconds));
    setPosition(audio.currentTime);
  }

  const rates = [1, 1.25, 1.5, 1.75, 2];
  const nextRate = () => {
    const i = rates.indexOf(speed), next = rates[(i + 1) % rates.length] ?? 1;
    setSpeed(next);
    if (ref.current) ref.current.playbackRate = next;
  };

  return (
    <section aria-label={ar ? 'مشغل حلقة البودكاست' : 'Podcast episode player'} className="rounded-3xl border border-white/15 bg-[#241b2d] p-5 shadow-xl sm:p-7">
      <audio
        ref={ref}
        preload="metadata"
        src={`/api/podcasts/episodes/${encodeURIComponent(episodeId)}/audio`}
        onLoadedMetadata={(e) => { const value=e.currentTarget.duration; if (Number.isFinite(value)) setDuration(value); }}
        onDurationChange={(e) => { const value=e.currentTarget.duration; if (Number.isFinite(value)) setDuration(value); }}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onPlay={() => { setMusicPlaying(false); setPlaying(true); }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => { setPlaying(false); setMessage(ar ? 'ملف الحلقة غير متاح حاليًا.' : 'The episode audio is not available right now.'); }}
        onVolumeChange={(e) => setVolume(e.currentTarget.volume)}
      />
      <div className="mb-4 flex items-center justify-between gap-3 text-xs font-semibold text-[#b8adbf]">
        <span>{ar ? 'تقدم الحلقة' : 'Episode progress'}</span>
        <span dir="ltr" className="tabular-nums">{displayTime(position)} / {duration > 0 ? displayTime(duration) : '—'}</span>
      </div>
      <input
        type="range" min={0} max={duration || 1} step="1" value={Math.min(position, duration || 1)}
        onChange={(e) => { if (ref.current) ref.current.currentTime = Number(e.target.value); setPosition(Number(e.target.value)); }}
        aria-label={ar ? 'تقديم أو تأخير الحلقة' : 'Seek through episode'}
        className="w-full cursor-pointer accent-[#eab997]"
      />
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-7">
        <button type="button" onClick={() => skip(-15)} aria-label={ar ? 'ارجع 15 ثانية' : 'Back 15 seconds'} className="grid h-12 w-12 place-items-center rounded-full bg-[#392d43] text-white hover:bg-[#493854] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#eab997]"><RotateCcw className="h-6 w-6" /><span className="sr-only">15</span></button>
        <button type="button" onClick={toggle} aria-label={playing ? (ar ? 'إيقاف مؤقت' : 'Pause episode') : (ar ? 'تشغيل' : 'Play episode')} className="grid h-16 w-16 place-items-center rounded-full text-[#eab997] transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eab997]">
          {playing ? <Pause className="h-7 w-7" fill="currentColor" /> : <OddioPlayIcon size={66} />}
        </button>
        <button type="button" onClick={() => skip(30)} aria-label={ar ? 'قدم 30 ثانية' : 'Forward 30 seconds'} className="grid h-12 w-12 place-items-center rounded-full bg-[#392d43] text-white hover:bg-[#493854] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#eab997]"><RotateCw className="h-6 w-6" /><span className="sr-only">30</span></button>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
        <button type="button" onClick={nextRate} aria-label={ar ? 'غيّر سرعة التشغيل' : 'Change playback speed'} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#392d43] px-4 text-sm font-semibold text-white hover:bg-[#493854]">
          <Gauge className="h-4 w-4 text-[#eab997]" /> {speed}×
        </button>
        <label className="flex items-center gap-2 text-sm text-[#b8adbf]">
          <Volume2 className="h-4 w-4" aria-hidden="true" />
          <input aria-label={ar ? 'مستوى الصوت' : 'Volume'} type="range" min={0} max={1} step={0.05} value={volume}
            onChange={(e) => { const value = Number(e.target.value); if (ref.current) ref.current.volume = value; setVolume(value); }}
            className="w-24 cursor-pointer accent-[#eab997]" />
        </label>
      </div>
      {message ? <p role="alert" className="mt-4 rounded-xl bg-red-900/25 px-4 py-3 text-sm text-red-200">{message}</p> : null}
    </section>
  );
}
