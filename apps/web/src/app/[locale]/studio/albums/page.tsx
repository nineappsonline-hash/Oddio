import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlbumCreateForm } from '@/components/studio/StudioForms';
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
    title: t('studio.albums'),
    description: t('studio.subtitle'),
    path: '/studio/albums',
    noindex: true,
  });
}

export default async function StudioAlbumsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const t = createTranslator(locale);
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  if (!user.isArtistManager) redirect(`/${locale}/apply/artist`);
  const db = readDb();
  const artists = db.artists.filter((artist) => artist.ownerUserId === user.id);
  const artistIds = new Set(artists.map((artist) => artist.id));
  const albums = db.albums.filter((album) => artistIds.has(album.artistId));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.6fr]">
      <div>
        {albums.length === 0 ? (
          <EmptyState title={t('studio.noAlbums')} />
        ) : (
          <div className="card divide-y divide-white/5">
            {albums.map((album) => {
              const artist = artists.find((item) => item.id === album.artistId);
              return (
                <div
                  key={album.id}
                  className="flex items-center justify-between gap-3 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{album.title}</p>
                    <p className="text-xs text-muted">
                      {artist?.name} · {formatDate(album.releaseAt, locale)} ·{' '}
                      {album.status}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {artists.length > 0 ? <AlbumCreateForm artists={artists} /> : null}
    </div>
  );
}
