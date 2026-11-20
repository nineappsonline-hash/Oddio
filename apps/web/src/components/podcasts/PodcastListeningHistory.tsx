'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Headphones, Pause, Play, Search } from 'lucide-react';
import type { PodcastEpisode, PodcastShow } from '@/lib/podcasts/catalog';
import { isPodcastPlayback, podcastAsTrack } from '@/lib/podcast-playback';
import { usePlayer } from '@/lib/player-store';
import {
  PODCAST_PROGRESS_EVENT,
  isVisiblePodcastHistoryEntry,
  readPodcastSyncRecords,
  setPodcastEpisodePlayed,
  type SavedPodcastProgress,
} from '@/lib/podcast-progress-store';

type Filter = 'all' | 'unfinished' | 'finished';

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export function PodcastListeningHistory({
  locale,
  viewerId,
  episodes,
  shows,
}: {
  locale: 'ar' | 'en';
  viewerId: string | null;
  episodes: PodcastEpisode[];
  shows: PodcastShow[];
}) {
  const ar = locale === 'ar';
  const [records, setRecords] = useState<SavedPodcastProgress[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const play = usePlayer((state) => state.play);
  const currentTrack = usePlayer((state) => state.track);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const setPlaying = usePlayer((state) => state.setPlaying);
  const seek = usePlayer((state) => state.seek);

  useEffect(() => {
    const refresh = () => setRecords(readPodcastSyncRecords(viewerId));
    refresh();
    window.addEventListener(PODCAST_PROGRESS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(PODCAST_PROGRESS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [viewerId]);

  const episodeById = useMemo(
    () => new Map(episodes.map((episode) => [episode.id, episode])),
    [episodes],
  );
  const showById = useMemo(() => new Map(shows.map((show) => [show.id, show])), [shows]);
  const entries = useMemo(
    () =>
      records.flatMap((record) => {
        if (!isVisiblePodcastHistoryEntry(record)) return [];
        const episode = episodeById.get(record.episodeId);
        const show = episode ? showById.get(episode.showId) : undefined;
        return episode && show ? [{ record, episode, show }] : [];
      }),
    [records, episodeById, showById],
  );
  const finishedCount = entries.filter(({ record }) => record.completed).length;
  const unfinishedCount = entries.length - finishedCount;
  const visible = entries.filter(({ record, episode, show }) => {
    if (filter === 'finished' && !record.completed) return false;
    if (filter === 'unfinished' && record.completed) return false;
    const term = query.trim().toLocaleLowerCase();
    return !term || [episode.title, show.title].some((value) =>
      value.toLocaleLowerCase().includes(term),
    );
  });

  function updateStatus(
    episode: PodcastEpisode,
    finished: boolean,
  ) {
    const active = isPodcastPlayback(currentTrack) && currentTrack?.id === episode.id;
    if (active) {
      setPlaying(false);
      seek(finished ? episode.durationSeconds : 0);
    }
    const ok = setPodcastEpisodePlayed(viewerId, episode.id, episode.durationSeconds, finished);
    setNotice(ok
      ? finished
        ? ar ? 'اتعلمت الحلقة كمسموعة' : 'Episode marked as played'
        : ar ? 'اتعلمت الحلقة كغير مسموعة' : 'Episode marked as unplayed'
      : ar ? 'المتصفح رفض حفظ التغيير' : 'Unable to save this change in your browser',
    );
  }

  return (
    <section className="space-y-5" aria-label={ar ? 'سجل استماع البودكاست' : 'Podcast listening history'}>
      <div className="flex flex-wrap gap-2" role="group" aria-label={ar ? 'فلترة السجل' : 'History filters'}>
        {([
          ['all', ar ? 'الكل' : 'All', entries.length],
          ['unfinished', ar ? 'لسه مكملتهاش' : 'In progress', unfinishedCount],
          ['finished', ar ? 'اتسمعت' : 'Completed', finishedCount],
        ] as const).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition ${filter === value
              ? 'border-white/60 bg-white text-[#15121b]'
              : 'border-white/15 bg-white/[0.06] text-white hover:bg-white/15'}`}
          >
            {label} <span className="ms-1 opacity-70">{count}</span>
          </button>
        ))}
      </div>
      <label className="flex min-h-12 max-w-lg items-center gap-3 rounded-xl border border-white/20 bg-white/[0.06] px-4 focus-within:border-white/50">
        <Search className="h-4 w-4 shrink-0 text-white/60" aria-hidden="true" />
        <span className="sr-only">{ar ? 'ابحث في سجل الاستماع' : 'Search listening history'}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={ar ? 'دور على حلقة أو برنامج...' : 'Search episodes or shows...'}
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/45"
        />
      </label>
      <p className="min-h-4 text-xs text-white/70" role="status" aria-live="polite">{notice}</p>
      {!viewerId ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/70">
          {ar
            ? 'سجل الزائر بيتحفظ في جلسة المتصفح بس. سجل حسابك بيتزامن بين الأجهزة.'
            : 'Guest history lasts for this browser session. Sign in to sync your listening history across devices.'}
        </p>
      ) : null}
      {visible.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map(({ record, episode, show }) => {
            const active = isPodcastPlayback(currentTrack) && currentTrack?.id === episode.id;
            const percent = record.completed ? 100 :
              Math.max(0, Math.min(100, Math.round((record.seconds / episode.durationSeconds) * 100)));
            return (
              <article key={episode.id}
                className="min-w-0 space-y-3 rounded-2xl border border-white/15 bg-white/[0.055] p-4">
                <div className="flex gap-3">
                  {show.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={show.coverUrl} alt="" loading="lazy"
                      className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-white/10">
                      <Headphones className="h-6 w-6 text-white/70" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-white/60">{show.title}</p>
                    <Link href={`/${locale}/podcasts/episodes/${episode.id}`}
                      className="mt-1 line-clamp-2 font-bold leading-snug text-white hover:underline">
                      {episode.title}
                    </Link>
                    <span className="mt-1 flex items-center gap-1 text-xs text-white/70">
                      {record.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                      {record.completed
                        ? ar ? 'مكتملة' : 'Completed'
                        : `${percent}% · ${ar ? 'فاضل' : 'Remaining'} ${formatTime(episode.durationSeconds - record.seconds)}`}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/15"
                  role="progressbar" aria-label={ar ? `تقدم ${episode.title}` : `Progress for ${episode.title}`}
                  aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                  <div className="h-full rounded-full bg-[#d4b0f4]" style={{ width: `${percent}%` }} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button"
                    onClick={() => {
                      if (active) setPlaying(!isPlaying);
                      else play(podcastAsTrack(episode, show));
                    }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#1a1421] hover:bg-[#e9ddf7]">
                    {active && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {active && isPlaying
                      ? ar ? 'إيقاف' : 'Pause'
                      : record.completed
                        ? ar ? 'اسمع تاني' : 'Listen again'
                        : ar ? 'كمّل استماع' : 'Resume'}
                  </button>
                  <button type="button" onClick={() => updateStatus(episode, !record.completed)}
                    className="inline-flex min-h-11 items-center rounded-xl border border-white/25 px-3 text-sm font-semibold text-white hover:bg-white/10">
                    {record.completed
                      ? ar ? 'علّم كغير مسموعة' : 'Mark unplayed'
                      : ar ? 'علّم كمسموعة' : 'Mark played'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/15 bg-white/[0.05] px-5 py-12 text-center">
          <Headphones className="mx-auto h-9 w-9 text-white/50" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-bold text-white">
            {entries.length
              ? ar ? 'مفيش حلقات مطابقة' : 'No matching episodes'
              : ar ? 'سجل الاستماع فاضي لسه' : 'Nothing in your history yet'}
          </h2>
          <p className="mt-2 text-sm text-white/65">
            {ar ? 'جرب فلتر تاني أو اختار حلقة جديدة تسمعها.' : 'Try another filter or explore a podcast episode.'}
          </p>
          <Link href={`/${locale}/podcasts`}
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-bold text-[#1a1421]">
            {ar ? 'استكشف البودكاست' : 'Explore podcasts'}
          </Link>
        </div>
      )}
    </section>
  );
}
