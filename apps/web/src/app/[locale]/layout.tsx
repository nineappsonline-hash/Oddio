import type { Metadata, Viewport } from 'next';
import { Cairo, Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import type { Locale } from '@ai-music/contracts';
import { AppShell } from '@/components/layout/AppShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { seoAbsoluteUrl as absoluteUrl, SEO_CANONICAL_ORIGIN } from '@/lib/seo-origin';
import { StaticServiceWorker } from '@/components/providers/StaticServiceWorker';
import { dirFor, isLocale, locales } from '@/i18n/config';
import { getSessionUser } from '@/lib/auth/session';
import { getContentLanguagePreference } from '@/lib/content-language';
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
    safeLocale === 'ar'
      ? 'Oddio | اكتشف واسمع موسيقى بالذكاء الاصطناعي'
      : 'Oddio — Discover & Listen to AI-Generated Music';
  const description =
    safeLocale === 'ar'
      ? 'اكتشف أغاني أصلية وموسيقى بالذكاء الاصطناعي على Oddio. اسمع إصدارات جديدة، وتعرّف على فنانين وموسيقى عربية وعالمية.'
      : 'Discover original AI-generated songs, music artists and playlists on Oddio. Browse fresh releases, genres and mood-based music discovery.';
  return {
    metadataBase: new URL(SEO_CANONICAL_ORIGIN),
    title: { default: title, template: `%s · Oddio` },
    description,
    applicationName: 'Oddio',
    verification: {
      ...(process.env.GOOGLE_SITE_VERIFICATION
        ? { google: process.env.GOOGLE_SITE_VERIFICATION }
        : {}),
      ...(process.env.BING_SITE_VERIFICATION
        ? { other: { 'msvalidate.01': process.env.BING_SITE_VERIFICATION } }
        : {}),
    },
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [
        { url: '/glossy-gradient-play-loop-logo.png', type: 'image/png', sizes: 'any' },
      ],
      shortcut: '/glossy-gradient-play-loop-logo.png',
      apple: '/glossy-gradient-play-loop-logo.png',
    },
    alternates: {
      canonical: absoluteUrl(`/${safeLocale}`),
      languages: { en: absoluteUrl('/en'), ar: absoluteUrl('/ar'), 'x-default': absoluteUrl('/en') },
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
  const [user, contentLanguage] = await Promise.all([getSessionUser(), getContentLanguagePreference()]);
  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${inter.variable} ${cairo.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background text-ink">
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': absoluteUrl('/#website'),
            url: absoluteUrl('/'),
            name: 'Oddio',
            description: 'Listen to and discover original AI-generated music, artists and playlists.',
            inLanguage: ['en', 'ar'],
            publisher: { '@id': absoluteUrl('/#organization') },
          }}
        />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Organization',
            '@id': absoluteUrl('/#organization'),
            name: 'Oddio',
            url: absoluteUrl('/'),
            logo: absoluteUrl('/oddio-gradient-play-logo.png'),
          }}
        />
        <StaticServiceWorker />
        <AppShell locale={locale} user={user} contentLanguage={contentLanguage}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
