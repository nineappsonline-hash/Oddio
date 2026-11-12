import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { getAdminData } from '@/lib/data/queries';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { EmptyState } from '@/components/ui/EmptyState';
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
    title: t('admin.audit'),
    description: t('admin.subtitle'),
    path: '/admin/audit',
    noindex: true,
  });
}

export default async function AdminAuditPage({
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

  if (data.auditLogs.length === 0) return <EmptyState title={t('common.noResults')} />;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-muted">
            <th className="p-3 text-start">{t('admin.action')}</th>
            <th className="p-3 text-start">{t('admin.entity')}</th>
            <th className="p-3 text-start">{t('admin.actor')}</th>
            <th className="p-3 text-start">{t('admin.when')}</th>
          </tr>
        </thead>
        <tbody>
          {data.auditLogs.map((entry) => (
            <tr key={entry.id} className="border-b border-white/5 last:border-0">
              <td className="p-3 font-medium text-ink">{entry.action}</td>
              <td className="p-3 text-xs text-muted">
                {entry.entityType} · {entry.entityId.slice(0, 8)}
              </td>
              <td className="p-3 text-xs text-muted">{entry.actorName}</td>
              <td className="p-3 text-xs text-muted">
                {formatDate(entry.createdAt, locale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
