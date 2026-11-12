import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';

const DOCS = {
  terms: { titleKey: 'legal.terms', bodyKey: 'legal.termsBody' },
  privacy: { titleKey: 'legal.privacy', bodyKey: 'legal.privacyBody' },
  'content-policy': {
    titleKey: 'legal.contentPolicy',
    bodyKey: 'legal.contentPolicyBody',
  },
  copyright: { titleKey: 'legal.copyright', bodyKey: 'legal.copyrightBody' },
} as const;

type Doc = keyof typeof DOCS;

function isDoc(value: string): value is Doc {
  return value in DOCS;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; doc: string }>;
}) {
  const { locale: raw, doc } = await params;
  const safeLocale: Locale = isLocale(raw) ? raw : 'en';
  const t = createTranslator(safeLocale);
  if (!isDoc(doc)) {
    return buildMetadata({
      locale: safeLocale,
      title: doc,
      description: '',
      noindex: true,
    });
  }
  return buildMetadata({
    locale: safeLocale,
    title: t(DOCS[doc].titleKey),
    description: t(DOCS[doc].bodyKey).slice(0, 160),
    path: `/legal/${doc}`,
  });
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ locale: string; doc: string }>;
}) {
  const { locale: raw, doc } = await params;
  if (!isLocale(raw) || !isDoc(doc)) notFound();
  const locale = raw;
  const t = createTranslator(locale);
  const entry = DOCS[doc];
  const lastUpdated = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date('2026-01-01'));

  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        {t('footer.legal')}
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">
        {t(entry.titleKey)}
      </h1>
      <p className="mt-2 text-xs text-muted">
        {t('legal.lastUpdated', { date: lastUpdated })}
      </p>
      <div className="card mt-8 space-y-5 p-6">
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink/85">
          {t(entry.bodyKey)}
        </p>
        <p className="text-sm text-muted">{t('legal.contact')}</p>
      </div>
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        {Object.keys(DOCS).map((key) => (
          <Link
            key={key}
            href={`/${locale}/legal/${key}`}
            className={
              key === doc ? 'font-semibold text-primary' : 'text-muted hover:text-ink'
            }
          >
            {t(DOCS[key as Doc].titleKey)}
          </Link>
        ))}
      </div>
      <Link
        href={`/${locale}`}
        className="mt-6 inline-block text-sm text-muted hover:text-ink"
      >
        ← {t('legal.backHome')}
      </Link>
    </article>
  );
}
