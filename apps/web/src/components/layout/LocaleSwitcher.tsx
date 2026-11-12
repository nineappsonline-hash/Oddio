'use client';

import { Languages } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocalePath, switchLocalePath } from '@/lib/use-locale-path';
import { localeLabel, otherLocale } from '@/i18n/config';

export function LocaleSwitcher() {
  const router = useRouter();
  const { locale, pathname } = useLocalePath();
  const next = otherLocale(locale);

  function onClick() {
    document.cookie = `aim_locale=${next}; path=/; max-age=31536000; samesite=lax`;
    router.push(switchLocalePath(pathname, next));
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-ink"
      aria-label={`Switch language to ${localeLabel(next)}`}
    >
      <Languages className="h-4 w-4" />
      {localeLabel(next)}
    </button>
  );
}
