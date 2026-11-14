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
import { AdminQuotaForm, AdminRoleForm } from '@/components/admin/AdminActions';
import { Badge } from '@/components/ui/Badge';

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
    title: t('admin.users'),
    description: t('admin.subtitle'),
    path: '/admin/users',
    noindex: true,
  });
}

export default async function AdminUsersPage({
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
    <div>
      {data.users.length === 0 ? (
        <EmptyState title={t('admin.usersEmpty')} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-start text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-muted">
                <th className="p-3 text-start">{t('admin.user')}</th>
                <th className="p-3 text-start">{t('admin.role')}</th>
                <th className="p-3 text-start">{t('admin.quota')}</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((row) => {
                const quota = db.quotaLimits.find((limit) => limit.ownerId === row.id);
                return (
                  <tr key={row.id} className="border-b border-white/5 last:border-0">
                    <td className="p-3">
                      <p className="font-semibold text-ink">{row.displayName}</p>
                      <p className="text-xs text-muted">
                        {row.email} · @{row.handle}
                      </p>
                      <div className="mt-1 flex gap-1">
                        {row.roles.length === 0 ? (
                          <Badge tone="neutral">{t('admin.role.listener')}</Badge>
                        ) : (
                          row.roles.map((role) => (
                            <Badge key={role} tone="primary">
                              {t(`admin.role.${role}`)}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <AdminRoleForm userId={row.id} currentRole={row.roles[0] ?? null} />
                    </td>
                    <td className="p-3">
                      <AdminQuotaForm
                        userId={row.id}
                        currentLimit={quota?.dailyLimit ?? 5}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">{t('admin.artistApprovedNote')}</p>
    </div>
  );
}
