import type { Locale } from '@ai-music/contracts';

export const locales: Locale[] = ['en', 'ar'];
export const defaultLocale: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (locales as string[]).includes(value);
}

export function dirFor(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function localeLabel(locale: Locale): string {
  return locale === 'ar' ? 'العربية' : 'English';
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'ar' ? 'en' : 'ar';
}
