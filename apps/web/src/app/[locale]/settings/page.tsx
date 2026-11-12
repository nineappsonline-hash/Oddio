import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { PageHeader } from '@/components/ui/PageHeader';
import { SettingsForm } from '@/components/settings/SettingsForm';

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
    title: t('settings.title'),
    description: t('settings.profile'),
    path: '/settings',
    noindex: true,
  });
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const t = createTranslator(locale);
  const user = await getSessionUser();
  if (!user)
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/settings`)}`);

  return (
    <div>
      <PageHeader title={t('settings.title')} subtitle={t('settings.profile')} />
      <SettingsForm user={user} locale={locale} />
      <div className="card mt-6 max-w-xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          {t('settings.privacy')}
        </h2>
        <p className="mt-2 text-sm text-muted">{t('settings.privacyBody')}</p>
        <p className="mt-4 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
          {t('settings.deleteWarning')}
        </p>
      </div>
    </div>
  );
}
