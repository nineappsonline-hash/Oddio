import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { safeRedirect } from '@/lib/utils';
import { SignupForm } from '@/components/auth/AuthForms';

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
    title: t('auth.signupTitle'),
    description: t('auth.signupSubtitle'),
    path: '/signup',
    noindex: true,
  });
}

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const t = createTranslator(locale);
  const sp = await searchParams;
  const next = safeRedirect(typeof sp.next === 'string' ? sp.next : null, `/${locale}`);
  const user = await getSessionUser();
  if (user) redirect(next);

  return (
    <div className="mx-auto grid max-w-5xl gap-10 py-6 lg:grid-cols-2 lg:items-center">
      <div className="hidden lg:block">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {t('app.shortTagline')}
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-ink">
          {t('auth.signupTitle')}
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted">{t('auth.signupSubtitle')}</p>
      </div>
      <div className="card p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-ink">{t('auth.signupTitle')}</h2>
        <p className="mt-1 text-sm text-muted">{t('auth.signupSubtitle')}</p>
        <div className="mt-6">
          <SignupForm locale={locale} next={next} />
        </div>
      </div>
    </div>
  );
}
