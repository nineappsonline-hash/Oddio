import type { Metadata, Viewport } from 'next';
import { Cairo, Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import type { Locale } from '@ai-music/contracts';
import { AppShell } from '@/components/layout/AppShell';
import { dirFor, isLocale, locales } from '@/i18n/config';
import { getSessionUser } from '@/lib/auth/session';
import { env } from '@/lib/env';
import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-cairo',
});

export const viewport: Viewport = {
  themeColor: '#100C0D',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : 'en';
  const title =
    safeLocale === 'ar' ? 'Oddio — عالمك الموسيقي' : 'Oddio — Your music universe';
  const description =
    safeLocale === 'ar'
      ? 'منصة عالمية لسماع ونشر الموسيقى المعمولة بالذكاء الاصطناعي، ببلاش ومن غير إعلانات وبيتراجع بشريًا قبل ما تنزل.'
      : 'A global listening and publishing platform for AI-generated music. Free, ad-free and human-reviewed before release.';
  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: title, template: `%s · Oddio` },
    description,
    applicationName: 'Oddio',
    icons: {
      icon: [{ url: '/glossy-gradient-play-loop-logo.png', type: 'image/png', sizes: 'any' }],
      shortcut: '/glossy-gradient-play-loop-logo.png',
      apple: '/glossy-gradient-play-loop-logo.png',
    },
    alternates: {
      canonical: `${env.siteUrl}/${safeLocale}`,
      languages: { en: `${env.siteUrl}/en`, ar: `${env.siteUrl}/ar` },
    },
    openGraph: { title, description, siteName: 'Oddio', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await getSessionUser();
  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${inter.variable} ${cairo.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background text-ink">
        <AppShell locale={locale} user={user}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
