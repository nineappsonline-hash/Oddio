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
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const t = createTranslator(locale);
  const filters = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  if (!user.roles.some((role) => role === 'admin' || role === 'super_admin'))
    redirect(`/${locale}`);
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const data = getAdminData(db, user.roles[0]!);
  const isSuperAdmin = user.roles.includes('super_admin');
  const q = (filters.q ?? '').trim().toLocaleLowerCase();
  const role = filters.role ?? 'all';
  const users = data.users.filter(
    (row) =>
      (role === 'all' ||
        (role === 'listener'
          ? row.roles.length === 0
          : row.roles.includes(role as 'admin' | 'super_admin' | 'moderator'))) &&
      (!q ||
        [row.displayName, row.handle, row.email, row.id].some((value) =>
          value.toLocaleLowerCase().includes(q),
        )),
  );

  return (
    <div className="space-y-5">
      <header className="card p-5">
        <h2 className="text-xl font-bold text-ink">
          {locale === 'ar' ? 'المستخدمون والصلاحيات' : 'Users & access'}
        </h2>
        <p className="mt-1 text-xs text-muted">
          {locale === 'ar'
            ? 'إدارة حصص الرفع، وصلاحيات الموظفين للسوبر أدمن فقط.'
            : 'Manage upload quotas. Only super admins can change staff roles.'}
        </p>
        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1 text-xs text-muted">
            {locale === 'ar' ? 'بحث عن مستخدم' : 'Search users'}
            <input
              name="q"
              defaultValue={filters.q ?? ''}
              className="input mt-1 w-full"
            />
          </label>
          <label className="text-xs text-muted">
            {locale === 'ar' ? 'الدور' : 'Role'}
            <select name="role" defaultValue={role} className="input mt-1 min-w-40">
              <option value="all">All</option>
              <option value="listener">Listener</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
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
          {users.length} / {data.users.length}
        </p>
      </header>
      {users.length === 0 ? (
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
              {users.map((row) => {
                const quota = db.quotaLimits.find((limit) => limit.ownerId === row.id);
                return (
                  <tr key={row.id} className="border-b border-white/5 last:border-0">
                    <td className="p-3">
                      <p className="font-semibold text-ink">{row.displayName}</p>
                      <p className="text-xs text-muted">
                        {row.email ? `${row.email} · ` : ''}@{row.handle}
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
                      {isSuperAdmin ? (
                        <AdminRoleForm
                          userId={row.id}
                          currentRole={row.roles[0] ?? null}
                        />
                      ) : (
                        <span className="text-xs text-muted">
                          {locale === 'ar' ? 'للسوبر أدمن فقط' : 'Super admin only'}
                        </span>
                      )}
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
