'use client';

import { usePathname } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';

export function useLocalePath(): { locale: Locale; pathname: string } {
  const pathname = usePathname() || '/en';
  const locale: Locale = pathname.split('/')[1] === 'ar' ? 'ar' : 'en';
  return { locale, pathname };
}

export function loginHref(locale: Locale, next: string): string {
  return `/${locale}/login?next=${encodeURIComponent(next)}`;
}

export function switchLocalePath(pathname: string, locale: Locale): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'en' || segments[0] === 'ar') {
    segments[0] = locale;
  } else {
    segments.unshift(locale);
  }
  return `/${segments.join('/')}`;
}
