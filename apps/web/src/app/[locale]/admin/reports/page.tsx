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
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminReportActions } from '@/components/admin/AdminActions';
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
    title: t('admin.reports'),
    description: t('admin.subtitle'),
    path: '/admin/reports',
    noindex: true,
  });
}

export default async function AdminReportsPage({
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

  return (
    <div className="space-y-3">
      {data.openReports.length === 0 ? (
        <EmptyState title={t('admin.noReports')} />
      ) : (
        data.openReports.map((report) => (
          <article key={report.id} className="card space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-ink">
                  {report.targetType}: {report.targetLabel}
                </h2>
                <p className="text-xs text-muted">
                  {report.reason} · {t('admin.reportedBy')} {report.reporterName} ·{' '}
                  {formatDate(report.createdAt, locale)}
                </p>
              </div>
              <Badge tone={report.status === 'open' ? 'warning' : 'neutral'}>
                {t(`admin.status.${report.status}`)}
              </Badge>
            </div>
            {report.details ? (
              <p className="rounded-lg bg-white/5 p-3 text-xs text-muted">
                {report.details}
              </p>
            ) : null}
            <AdminReportActions reportId={report.id} />
          </article>
        ))
      )}
    </div>
  );
}
