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
  if (!user.roles.some((role) => role === 'admin' || role === 'super_admin'))
    redirect(`/${locale}`);
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const data = getAdminData(db, user.roles[0]!);
  const artistName = new Map(db.artists.map((artist) => [artist.id, artist.name]));
  const requests = [...data.pendingVerification].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className="space-y-5">
      <header className="card p-5">
        <h2 className="text-xl font-bold text-ink">
          {locale === 'ar' ? 'طلبات توثيق الفنانين' : 'Artist verification queue'}
        </h2>
        <p className="mt-1 text-xs text-muted">
          {locale === 'ar'
            ? 'راجع الأدلة قبل الموافقة أو الرفض. الطلبات الأقدم أولًا.'
            : 'Review evidence before approving or rejecting. Oldest first.'}
        </p>
        <p className="mt-3 text-sm font-bold text-primary">
          {requests.length} {locale === 'ar' ? 'طلب معلق' : 'pending requests'}
        </p>
      </header>
      {requests.length === 0 ? (
        <EmptyState title={t('admin.noVerification')} />
      ) : (
        requests.map((request) => (
          <article key={request.id} className="card space-y-3 p-4">
            <div>
              <h2 className="text-sm font-bold text-ink">
                {artistName.get(request.artistId) ?? request.artistId}
              </h2>
              <p className="text-xs text-muted">
                {request.evidence} · {formatDate(request.createdAt, locale)}
              </p>
            </div>
            {Date.now() - new Date(request.createdAt).getTime() >= 48 * 3600000 && (
              <p className="text-xs font-bold text-amber-300">
                {locale === 'ar'
                  ? 'الطلب منتظر أكثر من 48 ساعة'
                  : 'Waiting over 48 hours'}
              </p>
            )}
            <AdminVerificationActions requestId={request.id} />
          </article>
        ))
      )}
    </div>
  );
}
