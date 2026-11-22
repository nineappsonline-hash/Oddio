import { filterMusicDb, getContentLanguagePreference } from '@/lib/content-language';
import Link from 'next/link';
import { Search as SearchIcon, ArrowUpRight, Headphones } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { searchQuery } from '@ai-music/contracts';
import { searchCatalog } from '@/lib/data/queries';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase, searchPublishedTrackPage } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getViewer } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { TrackRow } from '@/components/music/TrackRow';
import { ArtistCard } from '@/components/music/ArtistCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';
import { SearchExperience } from '@/components/search/SearchExperience';

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
  const value = (key: string) => (typeof sp[key] === 'string' ? sp[key] : undefined);
  const parsed = searchQuery.safeParse({
    q,
    genre: value('genre') || undefined,
    mood: value('mood') || undefined,
    language: value('language') || undefined,
    sort: value('sort') || undefined,
    limit: 25,
    cursor,
  });
  const query = parsed.success ? parsed.data : searchQuery.parse({});
  const viewer = await getViewer();
  const contentLanguage = await getContentLanguagePreference();
  // The current RPC covers published music; preserve the existing local
  // fuzzy/Arabic normalization path until its database equivalent is verified.
  const dbSearchSupported = !query.q || !/[\u0600-\u06ff]/.test(query.q);
  const paged =
    !demoMode && dbSearchSupported && Boolean(query.q || query.genre || query.mood || query.language)
      ? await searchPublishedTrackPage({
          query: query.q,
          genreSlug: query.genre,
          moodSlug: query.mood,
          language: query.language,
          sort: query.sort,
          cursor: query.cursor,
          limit: query.limit,
          arabicOnly: contentLanguage === 'ar',
        }).catch((error: unknown) => {
          console.error('Indexed catalog query failed:', error);
          return null;
        })
      : null;
  const db = filterMusicDb(
    demoMode
      ? readDb()
      : await loadDbFromSupabase({
          homeOnly: true,
          homeViewerId: viewer.userId,
          ...(paged ? { searchTrackIds: paged.ids } : {}),
        }),
    contentLanguage,
  );
  const genres = db.genres.filter((genre) => genre.active);
  const moods = db.moods.filter((mood) => mood.active);
  const hasSearch = Boolean(query.q || query.genre || query.mood || query.language);
  const resultPage = hasSearch
    ? searchCatalog(db, viewer, paged ? { ...query, cursor: undefined } : query)
    : null;
  // Track IDs and ranking come from the database, not a second in-memory
  // ranking pass. Still resolve artist, album and playlist sidebar matches
  // through the existing catalogue to preserve their current UX.
  const unranked = paged && hasSearch
    ? searchCatalog(db, viewer, { ...query, q: '', cursor: undefined })
    : null;
  const byId = new Map(unranked?.tracks.map((track) => [track.id, track]));
  const rankedTracks = paged
    ? paged.ids.flatMap((id) => {
        const track = byId.get(id);
        return track ? [track] : [];
      })
    : resultPage?.tracks;
  const results = paged && resultPage
    ? { ...resultPage, tracks: rankedTracks ?? [], total: paged.total, nextCursor: paged.nextCursor }
    : resultPage;
  const nextPageParams = new URLSearchParams();
  for (const key of ['q', 'genre', 'mood', 'language', 'sort'] as const) {
    const selected = query[key];
    if (selected) nextPageParams.set(key, selected);
  }
  if (results?.nextCursor) nextPageParams.set('cursor', results.nextCursor);

  return (
    <div className="oddio-explore-page oddio-search-page">
      <header className="oddio-explore-heading">
        <div>
          <p className="oddio-micro-label">
            <SearchIcon size={14} />{' '}
            {locale === 'ar' ? 'دور على صوتك' : 'DISCOVER THE UNEXPECTED'}
          </p>
          <h1>{t('search.title')}</h1>
          <p>{t('search.hint')}</p>
        </div>
        <Link href={`/${locale}/soundspace`} className="oddio-explore-mood-link">
          <Headphones size={16} />
          {locale === 'ar' ? 'استكشف حسب المود' : 'Find your mood'}{' '}
          <ArrowUpRight size={16} />
        </Link>
      </header>
      <SearchExperience
        locale={locale}
        initialQuery={q}
        userId={viewer.userId}
        placeholder={t('search.placeholder')}
        searchLabel={t('search.title')}
      />

      <form
        method="get"
        action={`/${locale}/search`}
        className="mb-8 flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
      >
        <input type="hidden" name="q" value={q} />
        <label className="flex min-w-[140px] flex-1 flex-col gap-1.5 text-xs font-semibold text-muted">
          {locale === 'ar' ? 'النوع الموسيقي' : 'Genre'}
          <select
            name="genre"
            defaultValue={query.genre ?? ''}
            className="input min-h-11"
          >
            <option value="">{locale === 'ar' ? 'كل الأنواع' : 'All genres'}</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.slug}>
                {locale === 'ar' ? genre.labelAr : genre.labelEn}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[140px] flex-1 flex-col gap-1.5 text-xs font-semibold text-muted">
          {locale === 'ar' ? 'المزاج' : 'Mood'}
          <select name="mood" defaultValue={query.mood ?? ''} className="input min-h-11">
            <option value="">{locale === 'ar' ? 'كل الحالات' : 'All moods'}</option>
            {moods.map((mood) => (
              <option key={mood.id} value={mood.slug}>
                {locale === 'ar' ? mood.labelAr : mood.labelEn}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[120px] flex-1 flex-col gap-1.5 text-xs font-semibold text-muted">
          {locale === 'ar' ? 'اللغة' : 'Language'}
          <select
            name="language"
            defaultValue={query.language ?? ''}
            className="input min-h-11"
          >
            <option value="">{locale === 'ar' ? 'كل اللغات' : 'All languages'}</option>
            <option value="ar">{locale === 'ar' ? 'العربية' : 'Arabic'}</option>
            {contentLanguage === 'all' ? (
              <option value="en">{locale === 'ar' ? 'الإنجليزية' : 'English'}</option>
            ) : null}
          </select>
        </label>
        <label className="flex min-w-[120px] flex-1 flex-col gap-1.5 text-xs font-semibold text-muted">
          {locale === 'ar' ? 'الترتيب' : 'Sort by'}
          <select name="sort" defaultValue={query.sort} className="input min-h-11">
            <option value="relevant">
              {locale === 'ar' ? 'الأكثر صلة' : 'Relevance'}
            </option>
            <option value="newest">{locale === 'ar' ? 'الأحدث' : 'Newest'}</option>
            <option value="popular">
              {locale === 'ar' ? 'الأكثر استماعًا' : 'Most played'}
            </option>
          </select>
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-[#211518]"
        >
          {locale === 'ar' ? 'تطبيق الفلاتر' : 'Apply filters'}
        </button>
      </form>

      {hasSearch ? (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="font-semibold">
            {locale === 'ar' ? 'الفلاتر الحالية:' : 'Active filters:'}
          </span>
          {query.q ? (
            <span className="rounded-full border border-white/15 px-3 py-1.5">
              {query.q}
            </span>
          ) : null}
          {query.genre ? (
            <span className="rounded-full border border-white/15 px-3 py-1.5">
              {locale === 'ar' ? 'النوع:' : 'Genre:'} {query.genre}
            </span>
          ) : null}
          {query.mood ? (
            <span className="rounded-full border border-white/15 px-3 py-1.5">
              {locale === 'ar' ? 'المود:' : 'Mood:'} {query.mood}
            </span>
          ) : null}
          {query.language ? (
            <span className="rounded-full border border-white/15 px-3 py-1.5">
              {locale === 'ar' ? 'اللغة:' : 'Language:'} {query.language}
            </span>
          ) : null}
          <Link
            href={`/${locale}/search`}
            className="inline-flex min-h-10 items-center rounded-full border border-primary/40 px-3 font-semibold text-primary hover:bg-primary/10"
          >
            {locale === 'ar' ? 'مسح كل الفلاتر' : 'Clear all'}
          </Link>
        </div>
      ) : null}

      {!results ? (
        <EmptyState title={t('search.hint')} />
      ) : results.total === 0 &&
        results.artists.length === 0 &&
        results.albums.length === 0 &&
        results.playlists.length === 0 ? (
        <div className="space-y-5">
          <EmptyState title={t('common.noResults')} body={q} />
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <h2 className="text-base font-bold text-ink">
              {locale === 'ar'
                ? 'نجرب طريقة تانية؟'
                : 'Try another way to discover music'}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              {locale === 'ar'
                ? 'جرب اسم الأغنية أو الفنان بكلمات أقل، أو شيل الفلاتر واختار نوع موسيقي يعجبك.'
                : 'Try fewer words, search for a song or artist name, or remove filters and explore a genre.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(query.genre || query.mood || query.language) && query.q ? (
                <Link
                  href={`/${locale}/search?q=${encodeURIComponent(query.q)}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-primary/40 px-4 text-sm font-semibold text-primary hover:bg-primary/10"
                >
                  {locale === 'ar' ? 'ابحث من غير فلاتر' : 'Search without filters'}
                </Link>
              ) : null}
              <Link
                href={`/${locale}/discover`}
                className="inline-flex min-h-11 items-center rounded-full border border-primary/40 px-4 text-sm font-semibold text-primary hover:bg-primary/10"
              >
                {locale === 'ar'
                  ? 'استكشف الأغاني والتصنيفات'
                  : 'Browse genres and moods'}
              </Link>
            </div>
            {genres.length > 0 ? (
              <>
                <p className="mt-5 text-xs font-semibold text-muted">
                  {locale === 'ar' ? 'جرب نوع موسيقي مختلف' : 'Explore a different genre'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {genres.slice(0, 6).map((genre) => (
                    <Link
                      key={genre.id}
                      href={`/${locale}/search?genre=${encodeURIComponent(genre.slug)}`}
                      className="inline-flex min-h-10 items-center rounded-full border border-white/15 px-3 text-xs font-semibold text-ink hover:border-primary/50 hover:bg-white/5"
                    >
                      {locale === 'ar' ? genre.labelAr : genre.labelEn}
                    </Link>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {results.tracks.length > 0 ? (
            <section>
              <h2 className="mb-3 text-lg font-bold text-ink">{t('search.tracks')}</h2>
              <div className="oddio-explore-track-list divide-y divide-white/5 p-2">
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
                  href={`/${locale}/search?${nextPageParams.toString()}`}
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
              <div className="oddio-search-artist-grid grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
