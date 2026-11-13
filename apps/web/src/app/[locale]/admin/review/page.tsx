import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
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
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const data = getAdminData(db, user.roles[0]!);

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
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-muted">
                {locale === 'ar'
                  ? 'استمع للأغنية قبل اتخاذ القرار'
                  : 'Listen before making a decision'}
              </p>
              {track.audio ? (
                <>
                  {track.audio.processingStatus !== 'ready' && (
                    <p
                      role="status"
                      className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200"
                    >
                      {locale === 'ar'
                        ? 'الملف الأصلي موجود، لكن تجهيز نسخة البث لم يكتمل بعد. يمكنك الاستماع للملف الأصلي للمراجعة، ولن يتم نشر الأغنية قبل اكتمال المعالجة.'
                        : 'Original audio is uploaded, but streaming processing is not complete. You can preview the original. Approval is disabled until processing finishes; you can still request changes or reject.'}
                    </p>
                  )}
                  <audio
                    controls
                    preload="metadata"
                    className="w-full"
                    src={`/api/admin/tracks/${track.id}/preview`}
                    aria-label={`Preview ${track.title}`}
                  />
                </>
              ) : (
                <p
                  role="alert"
                  className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200"
                >
                  {locale === 'ar'
                    ? 'ملف الصوت غير موجود. لا يمكن الموافقة على الأغنية قبل إعادة رفعها.'
                    : 'Audio file is missing. The artist must re-upload the track before approval.'}
                </p>
              )}
              <AdminTrackDecision
                trackId={track.id}
                audioReady={
                  track.audio?.processingStatus === 'ready' ||
                  (track.audio?.format === 'mp3' && Boolean(track.audio?.sha256))
                }
              />
            </div>
          </article>
        ))
      )}
    </div>
  );
}
