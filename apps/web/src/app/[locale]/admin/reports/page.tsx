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
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const t = createTranslator(locale);
  const filters = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.roles.length === 0) redirect(`/${locale}`);
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const data = getAdminData(db, user.roles[0]!);
  const q = (filters.q ?? '').trim().toLocaleLowerCase();
  const status = filters.status ?? 'all';
  const reports = data.openReports
    .filter(
      (report) =>
        (status === 'all' || report.status === status) &&
        (!q ||
          [
            report.targetLabel,
            report.reason,
            report.reporterName,
            report.details ?? '',
          ].some((value) => value.toLocaleLowerCase().includes(q))),
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="space-y-5">
      <header className="card p-5">
        <h2 className="text-xl font-bold text-ink">
          {locale === 'ar' ? 'مركز البلاغات' : 'Report queue'}
        </h2>
        <p className="mt-1 text-xs text-muted">
          {locale === 'ar'
            ? 'البلاغات المفتوحة وقيد التحقيق، الأقدم أولًا.'
            : 'Open and investigating reports, oldest first.'}
        </p>
        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1 text-xs text-muted">
            {locale === 'ar' ? 'بحث' : 'Search'}
            <input
              name="q"
              defaultValue={filters.q ?? ''}
              className="input mt-1 w-full"
            />
          </label>
          <label className="text-xs text-muted">
            {locale === 'ar' ? 'الحالة' : 'Status'}
            <select name="status" defaultValue={status} className="input mt-1 min-w-40">
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
          >
            {locale === 'ar' ? 'تطبيق' : 'Apply'}
          </button>
        </form>
        <p className="mt-3 text-xs text-muted">
          {reports.length} / {data.openReports.length}
        </p>
      </header>
      {reports.length === 0 ? (
        <EmptyState title={t('admin.noReports')} />
      ) : (
        reports.map((report) => (
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
            {Date.now() - new Date(report.createdAt).getTime() >= 48 * 3600000 && (
              <p className="text-xs font-bold text-amber-300">
                {locale === 'ar'
                  ? 'البلاغ منتظر أكثر من 48 ساعة'
                  : 'Waiting over 48 hours'}
              </p>
            )}
            <AdminReportActions reportId={report.id} />
          </article>
        ))
      )}
    </div>
  );
}
