import Link from 'next/link';
import type { Locale } from '@ai-music/contracts';
import { createTranslator } from '@/i18n/dictionaries';
import { Equalizer } from '@/components/visuals/Equalizer';

export function Footer({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-10 overflow-hidden px-4 pb-40 pt-10 text-xs text-muted sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_240px_at_20%_0%,rgba(157,92,255,0.1),transparent_70%)]" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-8 end-0 select-none text-[9rem] font-black leading-none tracking-tighter text-white/[0.025] sm:text-[14rem]"
      >
        AI
      </span>
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient shadow-glow">
              <Equalizer bars={3} className="h-3.5 text-white" />
            </span>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-ink">
                {t('app.name')}
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-primary/80">
                {t('app.shortTagline')}
              </p>
            </div>
          </div>
          <p>{t('footer.tagline')}</p>
          <p className="max-w-xs text-muted/70">{t('footer.aiPolicy')}</p>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <p className="font-semibold uppercase tracking-wide text-ink/80">
              {t('footer.platform')}
            </p>
            <Link href={`/${locale}/discover`} className="block hover:text-ink">
              {t('nav.discover')}
            </Link>
            <Link href={`/${locale}/charts`} className="block hover:text-ink">
              {t('nav.charts')}
            </Link>
            <Link href={`/${locale}/apply/artist`} className="block hover:text-ink">
              {t('nav.apply')}
            </Link>
          </div>
          <div className="space-y-2">
            <p className="font-semibold uppercase tracking-wide text-ink/80">
              {t('footer.legal')}
            </p>
            <Link href={`/${locale}/legal/terms`} className="block hover:text-ink">
              {t('legal.terms')}
            </Link>
            <Link href={`/${locale}/legal/privacy`} className="block hover:text-ink">
              {t('legal.privacy')}
            </Link>
            <Link
              href={`/${locale}/legal/content-policy`}
              className="block hover:text-ink"
            >
              {t('legal.contentPolicy')}
            </Link>
            <Link href={`/${locale}/legal/copyright`} className="block hover:text-ink">
              {t('legal.copyright')}
            </Link>
          </div>
        </div>
      </div>
      <div className="relative mx-auto mt-8 flex max-w-7xl items-center gap-3">
        <Equalizer bars={8} className="h-3 flex-1 text-primary/30" />
        <p className="shrink-0 text-muted/60">{t('footer.rights', { year })}</p>
      </div>
    </footer>
  );
}
