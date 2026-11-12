import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { getAdminData } from '@/lib/data/queries';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { AdminFeaturedManager } from '@/components/admin/AdminFeaturedManager';

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
    title: t('admin.featured'),
    description: t('admin.subtitle'),
    path: '/admin/featured',
    noindex: true,
  });
}

export default async function AdminFeaturedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.roles.length === 0) redirect(`/${locale}`);
  const db = readDb();
  const data = getAdminData(db, user.roles[0]!);
  const tracks = db.tracks
    .filter((track) => track.publishStatus === 'published')
    .map((track) => ({ id: track.id, label: track.title }));
  const playlists = db.playlists
    .filter((playlist) => playlist.visibility === 'public')
    .map((playlist) => ({ id: playlist.id, label: playlist.title }));
  const labels = Object.fromEntries([
    ...db.tracks.map((track) => [track.id, track.title] as const),
    ...db.playlists.map((playlist) => [playlist.id, playlist.title] as const),
    ...db.artists.map((artist) => [artist.id, artist.name] as const),
  ]);

  return (
    <AdminFeaturedManager
      slots={data.featuredSlots}
      tracks={tracks}
      playlists={playlists}
      labels={labels}
    />
  );
}
