import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
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
  if (!user.roles.some((role) => role === 'admin' || role === 'super_admin')) redirect(`/${locale}`);
  const db = demoMode ? readDb() : await loadDbFromSupabase();
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
    <div className="space-y-5">
      <header className="card p-5"><h1 className="text-xl font-bold text-ink">{locale === 'ar' ? 'إدارة المحتوى المميز' : 'Featured & editorial content'}</h1><p className="mt-2 text-sm text-muted">{locale === 'ar' ? 'اختَر الأغاني وقوائم التشغيل التي تظهر في أقسام العرض المميزة. التغييرات تُحفظ في قاعدة بيانات الإنتاج.' : 'Manage highlighted tracks and playlists. Changes are saved to the production database.'}</p><p className="mt-2 text-xs text-muted">{data.featuredSlots.length} {locale === 'ar' ? 'عنصر مميز حاليًا' : 'current featured placements'}</p></header>
      <AdminFeaturedManager
      slots={data.featuredSlots}
      tracks={tracks}
      playlists={playlists}
      labels={labels}
    />
    </div>
  );
}
