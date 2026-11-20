import { NextResponse } from 'next/server';
import { getViewer } from '@/lib/auth/session';
import { demoMode } from '@/lib/env';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { listableTracks } from '@/lib/data/queries';
import { getPodcastCatalog, isPodcastId } from '@/lib/podcasts/catalog';

export const runtime = 'nodejs';

type Item = {
  id: string;
  title: string;
  subtitle: string;
  artworkUrl: string | null;
  durationSeconds: number;
  track?: ReturnType<typeof listableTracks>[number];
  episode?: { id: string; showId: string; title: string; durationSeconds: number };
  show?: {
    id: string;
    slug: string;
    title: string;
    artistId: string | null;
    coverUrl: string | null;
  };
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get('id') ?? '';
  const kind = params.get('kind');
  if (id.length > 120 || !['podcast', 'music'].includes(kind ?? '')) {
    return NextResponse.json(
      { error: 'Invalid recommendation request' },
      { status: 400 },
    );
  }
  try {
    let items: Item[] = [];
    if (kind === 'podcast') {
      if (!isPodcastId(id)) return NextResponse.json({ items: [] });
      const catalog = await getPodcastCatalog();
      const current = catalog.episodes.find((item) => item.id === id);
      const currentShow = catalog.shows.find((show) => show.id === current?.showId);
      if (current && currentShow) {
        const related = catalog.episodes
          .filter((item) => item.id !== id)
          .map((episode) => {
            const show = catalog.shows.find((s) => s.id === episode.showId);
            if (!show) return null;
            const score =
              (show.id === currentShow.id ? 100 : 0) +
              (show.categoryId === currentShow.categoryId ? 40 : 0) +
              (show.language === currentShow.language ? 15 : 0) +
              (show.artistId && show.artistId === currentShow.artistId ? 20 : 0);
            return { episode, show, score };
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
        related.sort(
          (a, b) =>
            b.score - a.score ||
            b.episode.publishedAt.localeCompare(a.episode.publishedAt),
        );
        items = related.slice(0, 8).map(({ episode, show }) => ({
          id: episode.id,
          title: episode.title,
          subtitle: show.title,
          artworkUrl: show.coverUrl,
          durationSeconds: episode.durationSeconds,
          episode: {
            id: episode.id,
            showId: episode.showId,
            title: episode.title,
            durationSeconds: episode.durationSeconds,
          },
          show: {
            id: show.id,
            slug: show.slug,
            title: show.title,
            artistId: show.artistId,
            coverUrl: show.coverUrl,
          },
        }));
      }
    } else {
      const viewer = await getViewer();
      const db = demoMode ? readDb() : await loadDbFromSupabase();
      // Use access-filtered catalog: no private, unapproved, or unreleased tracks.
      const visible = listableTracks(db, viewer);
      const current = visible.find((track) => track.id === id);
      if (current) {
        const ranked = visible
          .filter((track) => track.id !== id)
          .map((track) => ({
            track,
            score:
              (track.artistId === current.artistId ? 90 : 0) +
              (track.genreId && track.genreId === current.genreId ? 50 : 0) +
              (track.languageCode === current.languageCode ? 20 : 0) +
              (track.moodIds ?? []).filter((moodId) => current.moodIds?.includes(moodId))
                .length *
                12,
          }));
        ranked.sort(
          (a, b) => b.score - a.score || b.track.qualifiedPlays - a.track.qualifiedPlays,
        );
        items = ranked.slice(0, 8).map(({ track }) => ({
          id: track.id,
          title: track.title,
          subtitle: track.artist?.name ?? '',
          artworkUrl: track.artwork.url,
          durationSeconds: track.durationMs / 1000,
          track,
        }));
      }
    }
    return NextResponse.json(
      { items },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error(
      '[player/similar] failed',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return NextResponse.json(
      { items: [], error: 'Recommendations temporarily unavailable' },
      { status: 503 },
    );
  }
}
