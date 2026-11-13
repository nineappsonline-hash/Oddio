import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getHistoryData, getLibraryData } from '@/lib/data/queries';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getSessionUser } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TrackRow } from '@/components/music/TrackRow';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { ArtistListRow } from '@/components/music/ArtistCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';

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
    title: t('library.title'),
    description: t('library.subtitle'),
    path: '/library',
    noindex: true,
  });
}

export default async function LibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ likedSort?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const t = createTranslator(locale);
  const user = await getSessionUser();
  if (!user)
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/library`)}`);
  const viewer = { userId: user.id, roles: user.roles };
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const library = getLibraryData(db, viewer);
  const history = getHistoryData(db, viewer);
  const { likedSort: requestedSort } = await searchParams;
  const likedSort =
    requestedSort === 'title' || requestedSort === 'popular' ? requestedSort : 'recent';
  const likedTracks = [...library.likedTracks];
  if (likedSort === 'title')
    likedTracks.sort((a, b) => a.title.localeCompare(b.title, locale));
  if (likedSort === 'popular')
    likedTracks.sort((a, b) => b.qualifiedPlays - a.qualifiedPlays);

  return (
    <div className="space-y-12">
      <PageHeader
        title={t('library.title')}
        subtitle={t('library.subtitle')}
        actions={
          <ButtonLink href={`/${locale}/playlists/new`} size="sm">
            {t('library.createPlaylist')}
          </ButtonLink>
        }
      />

      <nav
        aria-label={locale === 'ar' ? 'أقسام المكتبة' : 'Library sections'}
        className="flex flex-wrap gap-2"
      >
        <a href="#liked" className="chip">
          {t('library.likes')}
        </a>
        <a href="#playlists" className="chip">
          {t('library.playlists')}
        </a>
        <a href="#recent" className="chip">
          {t('library.history')}
        </a>
      </nav>

      <section id="liked" className="scroll-mt-24">
        <SectionHeader title={t('library.likes')} />
        {likedTracks.length > 0 ? (
          <nav
            aria-label={locale === 'ar' ? 'ترتيب الأغاني المفضلة' : 'Sort liked songs'}
            className="mb-4 flex flex-wrap gap-2"
          >
            {(
              [
                ['recent', locale === 'ar' ? 'المضافة مؤخرًا' : 'Recently added'],
                ['title', locale === 'ar' ? 'الاسم' : 'Title'],
                ['popular', locale === 'ar' ? 'الأكثر استماعًا' : 'Most played'],
              ] as const
            ).map(([value, label]) => (
              <Link
                key={value}
                href={`/${locale}/library?likedSort=${value}#liked`}
                aria-current={likedSort === value ? 'page' : undefined}
                className={likedSort === value ? 'chip chip-active' : 'chip'}
              >
                {label}
              </Link>
            ))}
          </nav>
        ) : null}
        {likedTracks.length === 0 ? (
          <EmptyState title={t('library.emptyLikes')} />
        ) : (
          <div className="card divide-y divide-white/5 p-2">
            {likedTracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                queue={likedTracks}
                index={index}
                locale={locale}
              />
            ))}
          </div>
        )}
      </section>

      <section id="playlists" className="scroll-mt-24">
        <SectionHeader
          title={t('library.playlists')}
          action={
            <Link
              href={`/${locale}/playlists/new`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t('library.createPlaylist')}
            </Link>
          }
        />
        {library.playlists.length === 0 ? (
          <EmptyState
            title={t('library.emptyPlaylists')}
            action={
              <ButtonLink href={`/${locale}/playlists/new`} size="sm">
                {t('library.createPlaylist')}
              </ButtonLink>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {library.playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} locale={locale} />
            ))}
          </div>
        )}
        {library.followedPlaylists.length > 0 ? (
          <>
            <h3 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-muted">
              {t('common.following')}
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {library.followedPlaylists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} locale={locale} />
              ))}
            </div>
          </>
        ) : null}
      </section>

      <section id="recent" className="scroll-mt-24">
        <SectionHeader title={t('library.history')} />
        {history.length === 0 ? (
          <EmptyState title={t('library.emptyHistory')} />
        ) : (
          <div className="card divide-y divide-white/5 p-2">
            {history.slice(0, 50).map((track, index) => (
              <TrackRow
                key={`${track.id}-${track.playedAt}`}
                track={track}
                queue={history}
                index={index}
                locale={locale}
              />
            ))}
          </div>
        )}
      </section>

      {library.follows.length > 0 ? (
        <section>
          <SectionHeader title={t('common.artists')} />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {library.follows.map((artist) => (
              <ArtistListRow key={artist.id} artist={artist} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
