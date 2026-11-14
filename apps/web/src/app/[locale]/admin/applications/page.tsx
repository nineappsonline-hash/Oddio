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
import { AdminApplicationDecision } from '@/components/admin/AdminActions';
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
    title: t('admin.applications'),
    description: t('admin.subtitle'),
    path: '/admin/applications',
    noindex: true,
  });
}

export default async function AdminApplicationsPage({
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
  const staffRole = user.roles.find((role) => role === 'admin' || role === 'super_admin');
  if (!staffRole) redirect(`/${locale}`);
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const data = getAdminData(db, staffRole);
  const q = (filters.q ?? '').trim().toLocaleLowerCase();
  const status = filters.status ?? 'all';
  const applications = data.pendingApplications
    .filter((item) => (status === 'all' || item.status === status) &&
      (!q || [item.displayName, item.applicantName, item.contactEmail].some((value) => value.toLocaleLowerCase().includes(q))))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <h2 className="text-xl font-bold text-ink">{locale === 'ar' ? 'طلبات انضمام الفنانين' : 'Artist application queue'}</h2>
        <p className="mt-1 text-sm text-muted">{locale === 'ar' ? 'راجع بيانات الفنان وإقرار الحقوق قبل الموافقة.' : 'Check artist details and rights declaration before approval.'}</p>
        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1 text-xs text-muted">{locale === 'ar' ? 'بحث باسم الفنان أو البريد' : 'Search artist or email'}
            <input name="q" defaultValue={filters.q ?? ''} className="input mt-1 w-full" />
          </label>
          <label className="text-xs text-muted">{locale === 'ar' ? 'الحالة' : 'Status'}
            <select name="status" defaultValue={status} className="input mt-1 min-w-40">
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under review</option>
              <option value="needs_information">Needs information</option>
            </select>
          </label>
          <button type="submit" className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">{locale === 'ar' ? 'تطبيق' : 'Apply'}</button>
          <a href={`/${locale}/admin/applications`} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-muted">{locale === 'ar' ? 'مسح' : 'Clear'}</a>
        </form>
        <p className="mt-3 text-xs text-muted">{applications.length} / {data.pendingApplications.length} {locale === 'ar' ? 'طلب' : 'applications'}</p>
      </header>
      {applications.length === 0 ? (
        <EmptyState title={t('admin.noApplications')} />
      ) : (
        applications.map((application) => (
          <article key={application.id} className="card space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-ink">
                  {application.displayName}
                </h2>
                <p className="text-xs text-muted">
                  {application.applicantName} ·{' '}
                  {formatDate(application.createdAt, locale)}
                </p>
              </div>
              <Badge tone="warning">{t(`apply.status.${application.status}`)}</Badge>
            </div>
            <p className="whitespace-pre-line text-sm text-ink/85">
              {application.description}
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-muted">
              <span>{application.contactEmail}</span>
              {application.portfolioUrl ? (
                <a
                  href={application.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-cyan hover:underline"
                >
                  {application.portfolioUrl}
                </a>
              ) : null}
              <span>
                {t('apply.rights')}: {application.rightsDeclared ? '✓' : '—'}
              </span>
            </div>
            {Date.now() - new Date(application.createdAt).getTime() > 48 * 3600000 && <p className="text-xs font-semibold text-amber-300">{locale === 'ar' ? 'الطلب منتظر أكثر من 48 ساعة' : 'Waiting over 48 hours'}</p>}
            <AdminApplicationDecision applicationId={application.id} />
          </article>
        ))
      )}
    </div>
  );
}
