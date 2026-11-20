'use client';

import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { usePlayer } from '@/lib/player-store';
import { isPodcastPlayback, podcastAsTrack } from '@/lib/podcast-playback';
import type { PodcastEpisode, PodcastShow } from '@/lib/podcasts/catalog';
import { resumablePodcastProgress } from '@/lib/podcast-resume-progress';
import {
  PODCAST_PROGRESS_EVENT,
  clearPodcastProgress,
  readPodcastProgress,
  type SavedPodcastProgress,
} from '@/lib/podcast-progress-store';

function formatTime(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Only published episodes supplied by the server can appear in this local history. */
export function ContinueListening({
  locale, viewerId, episodes, shows,
}: {
  locale: 'ar' | 'en';
  viewerId: string | null;
  episodes: PodcastEpisode[];
  shows: PodcastShow[];
}) {
  const activeTrack = usePlayer((state) => state.track);
  const currentTime = usePlayer((state) => state.currentTime);
  const duration = usePlayer((state) => state.duration);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const setPlaying = usePlayer((state) => state.setPlaying);
  const play = usePlayer((state) => state.play);
  const seek = usePlayer((state) => state.seek);
  const [saved, setSaved] = useState<SavedPodcastProgress[]>([]);
  const ar = locale === 'ar';

  useEffect(() => {
    const refresh = () => setSaved(readPodcastProgress(viewerId));
    refresh();
    window.addEventListener(PODCAST_PROGRESS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(PODCAST_PROGRESS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [viewerId]);

  const episodeById = new Map(episodes.map((episode) => [episode.id, episode]));
  const showById = new Map(shows.map((show) => [show.id, show]));
  const recent = [...saved];
  if (isPodcastPlayback(activeTrack) && activeTrack) {
    const length = duration > 0 ? duration : activeTrack.durationMs / 1000;
    if (resumablePodcastProgress(currentTime, length)) {
      const activeSaved = recent.find((entry) => entry.episodeId === activeTrack.id);
      const latest: SavedPodcastProgress = {
        episodeId: activeTrack.id,
        seconds: currentTime,
        duration: length,
        updatedAt: activeSaved?.updatedAt ?? Date.now(),
      };
      const index = recent.findIndex((entry) => entry.episodeId === activeTrack.id);
      if (index >= 0) recent[index] = latest;
      else recent.unshift(latest);
    }
  }

  const entries = recent
    .filter((row) => episodeById.has(row.episodeId))
    .filter((row) => resumablePodcastProgress(row.seconds, row.duration))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 8)
    .flatMap((row) => {
      const episode = episodeById.get(row.episodeId);
      const show = episode ? showById.get(episode.showId) : null;
      const progress = resumablePodcastProgress(row.seconds, episode?.durationSeconds ?? row.duration);
      return episode && show && progress ? [{ row, episode, show, progress }] : [];
    });

  if (!entries.length) return null;

  return (
    <section aria-label={ar ? 'كمّل استماع' : 'Continue listening'}
      className="space-y-4 rounded-[26px] border border-white/20 bg-gradient-to-br from-[#28232e] via-[#181920] to-[#111216] p-4 text-white shadow-[0_16px_50px_rgba(0,0,0,.22)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-black sm:text-2xl">{ar ? 'كمّل من مكان ما وقفت' : 'Pick up where you left off'}</h2>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
          {entries.length} {ar ? 'حلقات' : 'episodes'}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {entries.map(({ row, episode, show, progress }) => {
          const active = isPodcastPlayback(activeTrack) && activeTrack?.id === episode.id;
          return (
            <article key={episode.id} className="min-w-0 rounded-2xl border border-white/15 bg-white/[0.06] p-3 sm:p-4">
              <div className="flex gap-3">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/15 bg-[#34303a]">
                  {show.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={show.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : <Play className="h-6 w-6 text-white/70" aria-hidden="true" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-white/65">{show.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-bold">{episode.title}</p>
                  <p className="mt-1 text-xs text-white/65">
                    {progress.percent}% · {ar ? 'فاضل' : 'Remaining'} {formatTime(progress.remaining)}
                  </p>
                </div>
              </div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}
                aria-label={ar ? `تقدم استماع ${episode.title}` : `Progress for ${episode.title}`}
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-[#d4b0f4]" style={{ width: `${progress.percent}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button"
                  onClick={() => {
                    if (active) setPlaying(!isPlaying);
                    else play(podcastAsTrack(episode, show));
                  }}
                  aria-label={active && isPlaying
                    ? ar ? `إيقاف ${episode.title}` : `Pause ${episode.title}`
                    : ar ? `كمّل ${episode.title}` : `Resume ${episode.title}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#21162d] hover:bg-[#e9ddf7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  {active && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {active && isPlaying ? ar ? 'إيقاف' : 'Pause' : ar ? 'كمّل استماع' : 'Resume'}
                </button>
                <button type="button"
                  onClick={() => {
                    clearPodcastProgress(viewerId, episode.id);
                    if (active) { seek(0); setPlaying(true); }
                    else play(podcastAsTrack(episode, show));
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/[0.06] px-3 text-sm font-semibold text-white hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />{ar ? 'من الأول' : 'Start over'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
