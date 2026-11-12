import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '', key: 'studio.dashboard' },
  { href: '/tracks', key: 'studio.tracks' },
  { href: '/albums', key: 'studio.albums' },
  { href: '/artists', key: 'studio.artists' },
  { href: '/verification', key: 'studio.verification' },
  { href: '/analytics', key: 'studio.analytics' },
] as const;

export default async function StudioLayout({
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
  if (!user) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/studio`)}`);

  return (
    <div>
      <PageHeader
        title={t('studio.title')}
        subtitle={t('studio.subtitle')}
        actions={
          user.isArtistManager ? (
            <ButtonLink href={`/${locale}/studio/tracks/new`} size="sm">
              {t('studio.uploadTrack')}
            </ButtonLink>
          ) : undefined
        }
      />
      {user.isArtistManager ? (
        <>
          <nav
            aria-label={t('studio.title')}
            className="mb-8 flex flex-wrap gap-1.5 border-b border-white/10 pb-3"
          >
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={`/${locale}/studio${tab.href}`}
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
      ) : (
        <EmptyState
          title={t('studio.applyFirst')}
          body={t('apply.subtitle')}
          action={
            <ButtonLink href={`/${locale}/apply/artist`} size="sm">
              {t('nav.apply')}
            </ButtonLink>
          }
        />
      )}
    </div>
  );
}
