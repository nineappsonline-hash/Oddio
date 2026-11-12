import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
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
  const data = getAdminData(readDb(), user.roles[0]!);

  return (
    <div className="space-y-3">
      {data.pendingApplications.length === 0 ? (
        <EmptyState title={t('admin.noApplications')} />
      ) : (
        data.pendingApplications.map((application) => (
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
            <AdminApplicationDecision applicationId={application.id} />
          </article>
        ))
      )}
    </div>
  );
}
