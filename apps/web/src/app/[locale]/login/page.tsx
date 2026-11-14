import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { safeRedirect } from '@/lib/utils';
import { LoginForm } from '@/components/auth/AuthForms';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';

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
    title: t('auth.loginTitle'),
    description: t('auth.loginSubtitle'),
    path: '/login',
    noindex: true,
  });
}

export default async function LoginPage({
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
  const oauthError = typeof sp.error === 'string' ? sp.error : '';
  const user = await getSessionUser();
  if (user) redirect(next);

  const initialError =
    oauthError === 'oauth_unavailable' ? t('auth.oauthUnavailable') : undefined;

  return (
    <div className="mx-auto grid max-w-5xl gap-10 py-6 lg:grid-cols-2 lg:items-center">
      <div className="hidden lg:block">
        <Image
          src="/oddio-logo-hq.png"
          alt="Oddio"
          width={360}
          height={120}
          className="mb-6 h-28 w-80 object-contain object-left"
          priority
        />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {t('app.shortTagline')}
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-ink">
          {t('auth.loginTitle')}
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted">{t('auth.loginSubtitle')}</p>
      </div>
      <div className="card p-6 sm:p-8">
        <Image
          src="/oddio-logo-hq.png"
          alt="Oddio"
          width={240}
          height={80}
          className="mx-auto mb-5 h-16 w-48 object-contain lg:hidden"
        />
        <h2 className="text-2xl font-bold text-ink">{t('auth.loginTitle')}</h2>
        <p className="mt-1 text-sm text-muted">{t('auth.loginSubtitle')}</p>
        <div className="mt-6">
          <LoginForm locale={locale} next={next} initialError={initialError} />
        </div>
        <SocialAuthButtons locale={locale} next={next} />
        <Link
          href={`/${locale}`}
          className="mt-6 block text-center text-xs text-muted hover:text-ink"
        >
          {t('common.back')}
        </Link>
      </div>
    </div>
  );
}
