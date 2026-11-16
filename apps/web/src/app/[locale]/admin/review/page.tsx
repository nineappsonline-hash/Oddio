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
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const t = createTranslator(locale);
  const filters = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.roles.length === 0) redirect(`/${locale}`);
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const data = getAdminData(db, user.roles[0]!);
  const canDecide = user.roles.includes('admin') || user.roles.includes('super_admin');
  const q = (filters.q ?? '').trim().toLocaleLowerCase();
  const status = filters.status ?? 'all';
  const tracks = data.pendingTracks
    .filter(
      (track) =>
        (status === 'all' || track.reviewStatus === status) &&
        (!q ||
          [track.title, track.artist?.name ?? '', track.id].some((value) =>
            value.toLocaleLowerCase().includes(q),
          )),
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <h2 className="text-xl font-bold text-ink">
          {locale === 'ar' ? 'قائمة مراجعة الأغاني' : 'Track review queue'}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {locale === 'ar'
            ? 'الأقدم أولًا. راجع الملف والبيانات قبل اتخاذ القرار.'
            : 'Oldest first. Check the audio and metadata before making a decision.'}
        </p>
        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1 text-xs text-muted">
            {locale === 'ar'
              ? 'بحث بالعنوان أو الفنان أو المعرّف'
              : 'Search title, artist or ID'}
            <input
              name="q"
              defaultValue={filters.q ?? ''}
              className="input mt-1 w-full"
            />
          </label>
          <label className="text-xs text-muted">
            {locale === 'ar' ? 'الحالة' : 'Status'}
            <select name="status" defaultValue={status} className="input mt-1 min-w-40">
              <option value="all">
                {locale === 'ar' ? 'كل الحالات' : 'All statuses'}
              </option>
              <option value="pending_review">Pending review</option>
              <option value="ready_for_review">Ready for review</option>
              <option value="processing">Processing</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
          >
            {locale === 'ar' ? 'تطبيق' : 'Apply'}
          </button>
          <Link
            href={`/${locale}/admin/review`}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm text-muted"
          >
            {locale === 'ar' ? 'مسح' : 'Clear'}
          </Link>
        </form>
        <p className="mt-3 text-xs text-muted">
          {tracks.length} / {data.pendingTracks.length}{' '}
          {locale === 'ar' ? 'أغنية' : 'tracks'}
        </p>
      </header>
      <Link href={`/${locale}/admin/podcasts`} className="inline-flex rounded-xl border border-[#8755b3] bg-[#362444] px-5 py-3 text-sm font-bold text-[#e6d2ff] hover:bg-[#493257]">
        {locale==='ar'?'مراجعة حلقات البودكاست ←':'Review podcast episodes →'}
      </Link>
      {tracks.length === 0 ? (
        <EmptyState title={t('admin.noTracks')} />
      ) : (
        tracks.map((track) => (
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
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                  <span className="rounded-lg border border-white/10 px-2 py-1">
                    {locale === 'ar' ? 'المدة' : 'Duration'}:{' '}
                    {track.durationMs
                      ? `${Math.floor(track.durationMs / 60000)}:${String(Math.floor((track.durationMs % 60000) / 1000)).padStart(2, '0')}`
                      : '—'}
                  </span>
                  <span className="rounded-lg border border-white/10 px-2 py-1">
                    {locale === 'ar' ? 'الصوت' : 'Audio'}:{' '}
                    {track.audio?.format?.toUpperCase() ?? 'Missing'}
                  </span>
                  <span className="rounded-lg border border-white/10 px-2 py-1">
                    {locale === 'ar' ? 'المعالجة' : 'Processing'}:{' '}
                    {track.audio?.processingStatus ?? '—'}
                  </span>
                  <span className="rounded-lg border border-white/10 px-2 py-1">
                    {locale === 'ar' ? 'الحجم' : 'Size'}:{' '}
                    {track.audio?.bytes
                      ? `${(track.audio.bytes / 1048576).toFixed(1)} MB`
                      : '—'}
                  </span>
                  {Date.now() - new Date(track.createdAt).getTime() > 48 * 3600000 && (
                    <span className="rounded-lg bg-amber-400/10 px-2 py-1 font-bold text-amber-300">
                      {locale === 'ar' ? 'أكثر من 48 ساعة' : 'Waiting over 48h'}
                    </span>
                  )}
                </div>
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
              {canDecide ? (
                <AdminTrackDecision
                  trackId={track.id}
                  audioReady={
                    track.audio?.processingStatus === 'ready' ||
                    (track.audio?.format === 'mp3' && Boolean(track.audio?.sha256))
                  }
                />
              ) : (
                <p className="rounded-lg border border-white/10 p-3 text-xs text-muted">
                  {locale === 'ar'
                    ? 'حسابك لديه صلاحية العرض فقط. قرارات الأغاني تتطلب Admin.'
                    : 'Read-only: track decisions require an admin role.'}
                </p>
              )}
            </div>
          </article>
        ))
      )}
    </div>
  );
}
