import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@ai-music/contracts';
import { createTranslator } from '@/i18n/dictionaries';

export function Footer({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-8 overflow-hidden px-4 pb-8 pt-8 text-xs text-muted sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_240px_at_20%_0%,rgba(157,92,255,0.1),transparent_70%)]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm space-y-3">
          <Link
            prefetch={false}
            href={`/${locale}`}
            aria-label="Oddio home"
            className="inline-flex items-center rounded-xl transition-opacity hover:opacity-85"
          >
            <Image
              src="/oddio-logo-hq.png"
              alt="Oddio"
              width={240}
              height={80}
              className="h-16 w-48 object-contain object-left sm:w-56"
            />
          </Link>
          <p>{t('footer.tagline')}</p>
          <p className="max-w-xs text-muted/70">{t('footer.aiPolicy')}</p>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <p className="font-semibold uppercase tracking-wide text-ink/80">
              {t('footer.platform')}
            </p>
            <Link
              prefetch={false}
              href={`/${locale}/discover`}
              className="block hover:text-ink"
            >
              {t('nav.discover')}
            </Link>
            <Link
              prefetch={false}
              href={`/${locale}/charts`}
              className="block hover:text-ink"
            >
              {t('nav.charts')}
            </Link>
            <Link
              prefetch={false}
              href={`/${locale}/apply/artist`}
              className="block hover:text-ink"
            >
              {t('nav.apply')}
            </Link>
          </div>
          <div className="space-y-2">
            <p className="font-semibold uppercase tracking-wide text-ink/80">
              {t('footer.legal')}
            </p>
            <Link
              prefetch={false}
              href={`/${locale}/legal/terms`}
              className="block hover:text-ink"
            >
              {t('legal.terms')}
            </Link>
            <Link
              prefetch={false}
              href={`/${locale}/legal/privacy`}
              className="block hover:text-ink"
            >
              {t('legal.privacy')}
            </Link>
            <Link
              prefetch={false}
              href={`/${locale}/legal/content-policy`}
              className="block hover:text-ink"
            >
              {t('legal.contentPolicy')}
            </Link>
            <Link
              prefetch={false}
              href={`/${locale}/legal/copyright`}
              className="block hover:text-ink"
            >
              {t('legal.copyright')}
            </Link>
          </div>
        </div>
      </div>
      <div className="relative mx-auto mt-6 max-w-7xl border-t border-white/10 pt-4">
        <p className="text-muted/60">{t('footer.rights', { year })}</p>
      </div>
    </footer>
  );
}
