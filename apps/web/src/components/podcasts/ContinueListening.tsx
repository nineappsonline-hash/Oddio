'use client';

import { Pause, Play, RotateCcw } from 'lucide-react';
import { usePlayer } from '@/lib/player-store';
import { isPodcastPlayback } from '@/lib/podcast-playback';
import { formatPodcastTime } from '@/lib/podcasts/catalog';
import { resumablePodcastProgress } from '@/lib/podcast-resume-progress';

/** Shows the last *unfinished* episode from the existing restored player state.
 * No new tracking or autoplay is introduced. Draft/private episode metadata is
 * not displayed: the server provides only published, accessible episode IDs.
 */
export function ContinueListening({
  locale, publishedEpisodeIds,
}: {
  locale: 'ar' | 'en';
  publishedEpisodeIds: string[];
}) {
  const track = usePlayer((state) => state.track);
  const currentTime = usePlayer((state) => state.currentTime);
  const duration = usePlayer((state) => state.duration);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const setPlaying = usePlayer((state) => state.setPlaying);
  const seek = usePlayer((state) => state.seek);
  const ar = locale === 'ar';

  if (!track || !isPodcastPlayback(track) || !publishedEpisodeIds.includes(track.id)) return null;
  const length = Number.isFinite(duration) && duration > 0 ? duration : track.durationMs / 1000;
  const progress = resumablePodcastProgress(currentTime, length);
  if (!progress) return null;
  const { percent, remaining } = progress;

  return (
    <section aria-label={ar ? 'كمّل استماع' : 'Continue listening'}
      className="overflow-hidden rounded-[26px] border border-white/20 bg-gradient-to-r from-[#2b2531] via-[#1d1b23] to-[#111216] p-4 text-white shadow-[0_16px_50px_rgba(0,0,0,.22)] sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-black sm:text-2xl">
          {ar ? 'كمّل من مكان ما وقفت' : 'Pick up where you left off'}
        </h2>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/85">
          {percent}% {ar ? 'اتسمعت' : 'listened'}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-[#34303a] sm:h-20 sm:w-20">
          {track.artwork.url ? (
            // Creator-supplied podcast covers can use approved external image URLs.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.artwork.url} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : <Play className="h-7 w-7 text-white/70" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-white/60">{track.artist?.name}</p>
          <p className="mt-1 line-clamp-2 text-base font-bold leading-snug sm:text-lg">{track.title}</p>
          <p className="mt-1 text-xs text-white/65">
            {ar ? 'فاضل' : 'Remaining'} {formatPodcastTime(remaining)}
          </p>
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/20"
        role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
        aria-label={ar ? 'نسبة الحلقة اللي اتسمعت' : 'Episode playback progress'}>
        <div className="h-full rounded-full bg-[#d4b0f4]" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setPlaying(!isPlaying)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#21162d] transition hover:bg-[#e9ddf7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label={isPlaying
            ? ar ? 'إيقاف الحلقة مؤقتًا' : 'Pause episode'
            : ar ? 'استكمال استماع الحلقة' : 'Resume episode'}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isPlaying ? ar ? 'إيقاف مؤقت' : 'Pause' : ar ? 'كمّل استماع' : 'Resume listening'}
        </button>
        <button type="button" onClick={() => { seek(0); setPlaying(true); }}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/[0.06] px-4 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {ar ? 'من الأول' : 'Start over'}
        </button>
      </div>
    </section>
  );
}
