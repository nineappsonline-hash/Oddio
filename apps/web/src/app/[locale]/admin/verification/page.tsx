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
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminVerificationActions } from '@/components/admin/AdminActions';
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
    title: t('admin.verification'),
    description: t('admin.subtitle'),
    path: '/admin/verification',
    noindex: true,
  });
}

export default async function AdminVerificationPage({
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
  if (user.roles.length === 0) redirect(`/${locale}`);
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const data = getAdminData(db, user.roles[0]!);
  const artistName = new Map(db.artists.map((artist) => [artist.id, artist.name]));

  return (
    <div className="space-y-3">
      {data.pendingVerification.length === 0 ? (
        <EmptyState title={t('admin.noVerification')} />
      ) : (
        data.pendingVerification.map((request) => (
          <article key={request.id} className="card space-y-3 p-4">
            <div>
              <h2 className="text-sm font-bold text-ink">
                {artistName.get(request.artistId) ?? request.artistId}
              </h2>
              <p className="text-xs text-muted">
                {request.evidence} · {formatDate(request.createdAt, locale)}
              </p>
            </div>
            <AdminVerificationActions requestId={request.id} />
          </article>
        ))
      )}
    </div>
  );
}
