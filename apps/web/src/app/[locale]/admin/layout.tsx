import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminNavigation } from '@/components/admin/AdminNavigation';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const t = createTranslator(locale);
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/admin`)}`);
  if (!user.roles.length)
    return <EmptyState title={t('admin.noAccess')} body={t('admin.noAccessBody')} />;

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.title')} subtitle={t('admin.subtitle')} />
      <div className="grid items-start gap-6 lg:grid-cols-[244px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 lg:sticky lg:top-24">
          <details className="group lg:hidden">
            <summary className="cursor-pointer list-none rounded-xl bg-primary/10 px-3 py-3 text-sm font-bold text-ink marker:hidden">
              <span aria-hidden="true">☰ </span>
              {locale === 'ar' ? 'أقسام الإدارة' : 'Admin sections'}
              <span className="float-end text-muted" aria-hidden="true">
                ⌄
              </span>
            </summary>
            <div className="pt-4">
              <AdminNavigation locale={locale} roles={user.roles} />
            </div>
          </details>
          <div className="hidden lg:block">
            <AdminNavigation locale={locale} roles={user.roles} />
          </div>
        </aside>
        <main id="admin-content" className="min-w-0 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
