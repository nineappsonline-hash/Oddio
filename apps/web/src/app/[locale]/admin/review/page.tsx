import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { getAdminData } from '@/lib/data/queries';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Artwork } from '@/components/ui/Artwork';
import { AdminTrackDecision } from '@/components/admin/AdminActions';
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
    title: t('admin.trackReview'),
    description: t('admin.subtitle'),
    path: '/admin/review',
    noindex: true,
  });
}

export default async function AdminReviewPage({
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
  const data = getAdminData(readDb(), user.roles[0]!);

  return (
    <div className="space-y-3">
      {data.pendingTracks.length === 0 ? (
        <EmptyState title={t('admin.noTracks')} />
      ) : (
        data.pendingTracks.map((track) => (
          <article key={track.id} className="card p-4">
            <div className="flex flex-wrap items-start gap-4">
              <Artwork
                title={track.title}
                url={track.artwork.url}
                accent={track.artwork.accent}
                className="h-20 w-20"
                rounded="rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/tracks/${track.id}-${track.slug}`}
                    className="text-base font-bold text-ink hover:underline"
                  >
                    {track.title}
                  </Link>
                  <Badge tone="warning">{t(`studio.status.${track.reviewStatus}`)}</Badge>
                  <Badge tone="neutral">{track.visibility}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {track.artist?.name} · {formatDate(track.createdAt, locale)} ·{' '}
                  {track.productionType === 'fully_ai'
                    ? t('track.fullyAi')
                    : t('track.aiAssisted')}
                </p>
                <p className="mt-2 max-w-2xl text-xs text-muted">{track.description}</p>
                <p className="mt-2 text-[11px] text-muted">
                  {t('track.aiTools')}: {track.aiTools || '—'} · {t('track.genre')}:{' '}
                  {track.genre
                    ? locale === 'ar'
                      ? track.genre.labelAr
                      : track.genre.labelEn
                    : '—'}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <AdminTrackDecision trackId={track.id} />
            </div>
          </article>
        ))
      )}
    </div>
  );
}
