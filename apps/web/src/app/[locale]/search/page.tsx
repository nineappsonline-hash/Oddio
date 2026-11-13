import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { searchQuery } from '@ai-music/contracts';
import { searchCatalog } from '@/lib/data/queries';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getViewer } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { PageHeader } from '@/components/ui/PageHeader';
import { TrackRow } from '@/components/music/TrackRow';
import { ArtistCard } from '@/components/music/ArtistCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : 'en';
  const t = createTranslator(safeLocale);
  return buildMetadata({
    locale: safeLocale,
    title: t('search.title'),
    description: t('search.hint'),
    path: '/search',
    noindex: true,
  });
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : '';
  const cursor =
    typeof sp.cursor === 'string' && /^\d+$/.test(sp.cursor) ? sp.cursor : undefined;
  const parsed = searchQuery.safeParse({ q, limit: 25, cursor });
  const query = parsed.success ? parsed.data : searchQuery.parse({});
  const viewer = await getViewer();
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const results = query.q ? searchCatalog(db, viewer, query) : null;

  return (
    <div>
      <PageHeader title={t('search.title')} subtitle={t('search.hint')} />
      <form method="get" action={`/${locale}/search`} className="mb-8 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={t('search.placeholder')}
          aria-label={t('search.title')}
          className="input h-12 flex-1 text-base"
        />
        <button
          type="submit"
          className="h-12 rounded-lg bg-primary px-6 text-sm font-semibold text-[#211518] hover:bg-primary-strong"
        >
          {t('common.search')}
        </button>
      </form>

      {!results ? (
        <EmptyState title={t('search.hint')} />
      ) : results.total === 0 &&
        results.artists.length === 0 &&
        results.albums.length === 0 ? (
        <div className="space-y-3">
          <EmptyState title={t('common.noResults')} body={q} />
          <Link
            href={`/${locale}/discover`}
            className="inline-flex min-h-11 items-center rounded-full border border-primary/40 px-4 text-sm font-semibold text-primary"
          >
            {locale === 'ar' ? 'استكشف الأغاني والتصنيفات' : 'Browse genres and moods'}
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {results.tracks.length > 0 ? (
            <section>
              <h2 className="mb-3 text-lg font-bold text-ink">{t('search.tracks')}</h2>
              <div className="card divide-y divide-white/5 p-2">
                {results.tracks.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    queue={results.tracks}
                    index={index}
                    locale={locale}
                  />
                ))}
              </div>
              {results.nextCursor ? (
                <Link
                  href={`/${locale}/search?q=${encodeURIComponent(query.q)}&cursor=${results.nextCursor}`}
                  className="mt-4 inline-flex min-h-11 items-center rounded-full border border-primary/40 px-5 text-sm font-semibold text-primary hover:bg-primary/10"
                >
                  {locale === 'ar' ? 'عرض المزيد من الأغاني' : 'More tracks'}
                </Link>
              ) : null}
            </section>
          ) : null}

          {results.artists.length > 0 ? (
            <section>
              <h2 className="mb-3 text-lg font-bold text-ink">{t('search.artists')}</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {results.artists.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} locale={locale} />
                ))}
              </div>
            </section>
          ) : null}

          {results.albums.length > 0 ? (
            <section>
              <h2 className="mb-3 text-lg font-bold text-ink">{t('search.albums')}</h2>
              <div className="card divide-y divide-white/5">
                {results.albums.map((album) => (
                  <Link
                    key={album.id}
                    href={`/${locale}/albums/${album.id}`}
                    className="flex items-center justify-between p-3 text-sm hover:bg-white/5"
                  >
                    <span className="font-semibold text-ink">{album.title}</span>
                    <span className="text-xs text-muted">
                      {album.artistName} · {formatDate(album.releaseAt, locale)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {results.playlists.length > 0 ? (
            <section>
              <h2 className="mb-3 text-lg font-bold text-ink">{t('search.playlists')}</h2>
              <div className="flex flex-wrap gap-2">
                {results.playlists.map((playlist) => (
                  <Link
                    key={playlist.id}
                    href={`/${locale}/playlists/${playlist.id}`}
                    className="rounded-pill border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink hover:border-primary/40"
                  >
                    {playlist.title}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
