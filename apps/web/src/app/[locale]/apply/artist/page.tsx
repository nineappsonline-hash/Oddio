import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ArtistApplicationStatus, Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { getApplicationForUser } from '@/lib/data/queries';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { ArtistApplicationForm } from '@/components/apply/ArtistApplicationForm';
import { formatDate } from '@/lib/utils';

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
    title: t('apply.title'),
    description: t('apply.subtitle'),
    path: '/apply/artist',
  });
}

const STATUS_TONE: Record<
  ArtistApplicationStatus,
  'primary' | 'cyan' | 'warning' | 'danger' | 'success' | 'neutral'
> = {
  draft: 'neutral',
  submitted: 'primary',
  under_review: 'warning',
  approved: 'success',
  rejected: 'danger',
  needs_information: 'warning',
};

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const t = createTranslator(locale);
  const user = await getSessionUser();
  if (!user) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/apply/artist`)}`);
  }
  const db = readDb();
  const application = getApplicationForUser(db, user.id);
  const canResubmit =
    application && ['rejected', 'needs_information'].includes(application.status);

  return (
    <div>
      <PageHeader title={t('apply.title')} subtitle={t('apply.subtitle')} />

      {application ? (
        <div className="mb-8 card max-w-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
              {t('apply.statusTitle')}
            </h2>
            <Badge tone={STATUS_TONE[application.status]}>
              {t(`apply.status.${application.status}`)}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-ink">{application.displayName}</p>
          <p className="mt-1 text-xs text-muted">
            {t('apply.submittedOn', { date: formatDate(application.createdAt, locale) })}
          </p>
          {application.reviewNotes ? (
            <div className="mt-4 rounded-lg bg-white/5 p-3 text-xs text-muted">
              <p className="font-semibold text-ink">{t('apply.notes')}</p>
              <p className="mt-1 whitespace-pre-line">{application.reviewNotes}</p>
            </div>
          ) : null}
          {application.status === 'approved' ? (
            <div className="mt-5">
              <ButtonLink href={`/${locale}/studio`} size="sm">
                {t('nav.studio')}
              </ButtonLink>
            </div>
          ) : null}
        </div>
      ) : null}

      {!application || canResubmit ? (
        <ArtistApplicationForm
          locale={locale}

          resubmit={Boolean(canResubmit)}
          defaults={
            application
              ? {
                  displayName: application.displayName,
                  description: application.description,
                  portfolioUrl: application.portfolioUrl,
                  contactEmail: application.contactEmail,
                }
              : undefined
          }
        />
      ) : (
        <p className="text-sm text-muted">
          {t('apply.alreadyApplied')} ·{' '}
          <Link href={`/${locale}/library`} className="text-primary hover:underline">
            {t('nav.library')}
          </Link>
        </p>
      )}
    </div>
  );
}
