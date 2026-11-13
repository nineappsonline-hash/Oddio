import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { getAdminData } from '@/lib/data/queries';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { Stat } from '@/components/ui/Stat';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { formatDate, formatNumber } from '@/lib/utils';

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
    title: t('admin.title'),
    description: t('admin.subtitle'),
    path: '/admin',
    noindex: true,
  });
}

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const t = createTranslator(locale);
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.roles.length === 0) redirect(`/${locale}`);
  const db = readDb();
  const data = getAdminData(db, user.roles[0]!);

  const stats = [
    { label: t('admin.stats.signups'), value: data.stats.users },
    { label: t('admin.stats.activeListeners'), value: data.stats.activeListeners },
    { label: t('admin.stats.qualifiedPlays'), value: data.stats.qualifiedPlays },
    { label: t('admin.stats.publishedTracks'), value: data.stats.publishedTracks },
    { label: t('admin.stats.pendingReviews'), value: data.stats.pendingReviews },
    { label: t('admin.stats.reportsOpen'), value: data.stats.openReports },
    {
      label: t('admin.stats.pendingApplications'),
      value: data.stats.pendingApplications,
    },
  ];

  return (
    <div className="space-y-8">
      <Link
        href={`/${locale}/admin/track-changes`}
        className="inline-flex rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/15 px-5 py-3 text-sm font-bold text-fuchsia-200 hover:bg-fuchsia-500/25"
      >
        Review lyrics & cover artwork requests →
      </Link>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Stat
            key={stat.label}
            label={stat.label}
            value={formatNumber(stat.value, locale)}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHeader title={t('admin.stats.topGenres')} />
          <div className="card space-y-2 p-4">
            {data.genreCounts.slice(0, 8).map((entry) => (
              <div
                key={entry.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-ink/85">{entry.label}</span>
                <span className="tabular-nums text-muted">{entry.count}</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <SectionHeader title={t('admin.stats.countryDistribution')} />
          <div className="card space-y-2 p-4">
            {data.countryCounts.slice(0, 8).map((entry) => (
              <div
                key={entry.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-ink/85">{entry.label}</span>
                <span className="tabular-nums text-muted">{entry.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section>
        <SectionHeader
          title={t('admin.auditLog')}
          action={
            <Link
              href={`/${locale}/admin/audit`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t('common.viewAll')}
            </Link>
          }
        />
        <div className="card divide-y divide-white/5">
          {data.auditLogs.slice(0, 8).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 p-3 text-xs"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{entry.action}</p>
                <p className="truncate text-muted">
                  {entry.actorName} · {entry.entityType}
                </p>
              </div>
              <span className="whitespace-nowrap text-muted">
                {formatDate(entry.createdAt, locale)}
              </span>
            </div>
          ))}
        </div>
      </section>
      <p className="text-xs text-muted">{t('admin.systemNote')}</p>
    </div>
  );
}
