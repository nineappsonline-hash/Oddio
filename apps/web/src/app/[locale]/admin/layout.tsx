import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '', key: 'admin.dashboard' },
  { href: '/review', key: 'admin.trackReview' },
  { href: '/applications', key: 'admin.applications' },
  { href: '/reports', key: 'admin.reports' },
  { href: '/comments', key: 'admin.comments' },
  { href: '/users', key: 'admin.users' },
  { href: '/verification', key: 'admin.verification' },
  { href: '/featured', key: 'admin.featured' },
  { href: '/audit', key: 'admin.audit' },
];

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
  const isStaff = user.roles.length > 0;

  return (
    <div>
      <PageHeader title={t('admin.title')} subtitle={t('admin.subtitle')} />
      {!isStaff ? (
        <EmptyState title={t('admin.noAccess')} body={t('admin.noAccessBody')} />
      ) : (
        <>
          <nav
            aria-label={t('admin.title')}
            className="mb-8 flex flex-wrap gap-1.5 border-b border-white/10 pb-3"
          >
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={`/${locale}/admin${tab.href}`}
                className={cn(
                  'rounded-pill px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-white/5 hover:text-ink',
                )}
              >
                {t(tab.key)}
              </Link>
            ))}
          </nav>
          {children}
        </>
      )}
    </div>
  );
}
