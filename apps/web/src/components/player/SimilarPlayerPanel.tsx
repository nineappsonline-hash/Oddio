'use client';

import { useEffect, useState } from 'react';
import { Headphones, Music2, Play, Plus } from 'lucide-react';
import { Artwork } from '@/components/ui/Artwork';
import { usePlayer } from '@/lib/player-store';
import { podcastAsTrack } from '@/lib/podcast-playback';
import type { CatalogTrack } from '@/lib/data/queries';
import type { PodcastEpisode, PodcastShow } from '@/lib/podcasts/catalog';

type SimilarItem = {
  id: string;
  title: string;
  subtitle: string;
  artworkUrl: string | null;
  durationSeconds: number;
  track?: CatalogTrack;
  episode?: { id: string; showId: string; title: string; durationSeconds: number };
  show?: {
    id: string;
    slug: string;
    title: string;
    artistId: string | null;
    coverUrl: string | null;
  };
};

export function SimilarPlayerPanel({
  trackId,
  podcast,
  rtl,
  active,
}: {
  trackId: string;
  podcast: boolean;
  rtl: boolean;
  active: boolean;
}) {
  const [items, setItems] = useState<SimilarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const play = usePlayer((state) => state.play);
  const addToQueue = usePlayer((state) => state.addToQueue);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    setItems([]);
    setError(false);
    setLoading(true);
    fetch(
      `/api/player/similar?kind=${podcast ? 'podcast' : 'music'}&id=${encodeURIComponent(trackId)}`,
      {
        signal: controller.signal,
        cache: 'no-store',
      },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load suggestions');
        return response.json() as Promise<{ items: SimilarItem[] }>;
      })
      .then((data) => {
        if (!controller.signal.aborted) setItems(data.items ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [trackId, podcast, active]);

  function asTrack(item: SimilarItem): CatalogTrack | null {
    if (!podcast) return item.track ?? null;
    if (!item.episode || !item.show) return null;
    return podcastAsTrack(item.episode as PodcastEpisode, item.show as PodcastShow);
  }

  return (
    <div
      role="tabpanel"
      aria-label={rtl ? 'اقتراحات مشابهة' : 'Similar suggestions'}
      className="scroll-thin min-h-0 flex-1 overflow-y-auto"
    >
      <p className="mb-3 text-xs leading-5 text-muted">
        {podcast
          ? rtl
            ? 'حلقات من نفس السلسلة أو نفس الموضوع'
            : 'Episodes from this series or similar topics'
          : rtl
            ? 'أغاني قريبة من النوع والفنان والمود'
            : 'Tracks with related artists, genres and moods'}
      </p>
      {loading ? (
        <div role="status" className="space-y-3" aria-label="Loading suggestions">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-xl border border-white/10 p-4 text-sm text-muted">
          {rtl
            ? 'تعذر تحميل الاقتراحات حاليًا.'
            : 'Suggestions are unavailable right now.'}
        </p>
      ) : items.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-muted">
          {podcast ? (
            <Headphones className="h-7 w-7 text-neutral-200" />
          ) : (
            <Music2 className="h-7 w-7 text-neutral-200" />
          )}
          {rtl ? 'مفيش اقتراحات مشابهة متاحة حاليًا.' : 'No similar items available yet.'}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="group flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[.045] backdrop-blur-md p-2 transition-colors hover:border-white/25 hover:bg-white/[.10]"
            >
              <button
                type="button"
                onClick={() => {
                  const selected = asTrack(item);
                  if (selected) play(selected);
                }}
                className="flex min-w-0 flex-1 items-center gap-3 text-start"
                aria-label={(rtl ? 'تشغيل ' : 'Play ') + item.title}
              >
                <Artwork
                  title={item.title}
                  url={item.artworkUrl ?? ''}
                  accent="#8e8e8e"
                  className="h-12 w-12 shrink-0"
                  rounded="rounded-lg"
                />
                <span className="min-w-0 flex-1">
                  <span
                    dir="auto"
                    className="block line-clamp-2 text-sm font-semibold leading-5 text-white group-hover:text-neutral-200"
                  >
                    {item.title}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted">
                    {item.subtitle}
                  </span>
                </span>
                <Play className="h-4 w-4 shrink-0 text-neutral-200" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const selected = asTrack(item);
                  if (selected) addToQueue(selected);
                }}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-neutral-200"
                aria-label={
                  (rtl ? 'إضافة إلى قائمة التشغيل: ' : 'Add to queue: ') + item.title
                }
                title={rtl ? 'أضف لقائمة التشغيل' : 'Add to queue'}
              >
                <Plus className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
