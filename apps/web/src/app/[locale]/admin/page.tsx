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
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const data = getAdminData(db, user.roles[0]!);

  const ar = locale === 'ar';
  const now = Date.now();
  const ageHours = (date: string) =>
    Math.max(0, (now - new Date(date).getTime()) / 3600000);
  const tasks = [
    ...data.openReports.map((item) => ({
      id: `report-${item.id}`,
      label: ar ? 'بلاغ مفتوح' : 'Open report',
      title: item.targetLabel,
      detail: item.reason,
      createdAt: item.createdAt,
      href: `/${locale}/admin/reports`,
      priority: ageHours(item.createdAt) >= 48 ? 0 : 1,
    })),
    ...data.pendingTracks.map((item) => ({
      id: `track-${item.id}`,
      label: ar ? 'مراجعة أغنية' : 'Track review',
      title: item.title,
      detail: item.artist?.name ?? '',
      createdAt: item.createdAt,
      href: `/${locale}/admin/review`,
      priority: ageHours(item.createdAt) >= 48 ? 0 : 2,
    })),
    ...data.pendingApplications.map((item) => ({
      id: `application-${item.id}`,
      label: ar ? 'طلب فنان' : 'Artist application',
      title: item.displayName,
      detail: item.status,
      createdAt: item.createdAt,
      href: `/${locale}/admin/applications`,
      priority: ageHours(item.createdAt) >= 48 ? 0 : 2,
    })),
    ...data.pendingVerification.map((item) => ({
      id: `verification-${item.id}`,
      label: ar ? 'طلب توثيق' : 'Verification',
      title:
        data.artists.find((artist) => artist.id === item.artistId)?.name ?? item.artistId,
      detail: item.status,
      createdAt: item.createdAt,
      href: `/${locale}/admin/verification`,
      priority: ageHours(item.createdAt) >= 48 ? 0 : 3,
    })),
  ].sort(
    (a, b) =>
      a.priority - b.priority ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const tiles = [
    {
      label: ar ? 'أغاني قيد المراجعة' : 'Tracks in review',
      value: data.pendingTracks.length,
      href: 'review',
    },
    {
      label: ar ? 'طلبات الفنانين' : 'Artist applications',
      value: data.pendingApplications.length,
      href: 'applications',
    },
    {
      label: ar ? 'بلاغات مفتوحة' : 'Open reports',
      value: data.openReports.length,
      href: 'reports',
    },
    {
      label: ar ? 'طلبات التوثيق' : 'Verification requests',
      value: data.pendingVerification.length,
      href: 'verification',
    },
  ];
  const totalQualified = data.stats.qualifiedPlays;
  const registeredListeners = new Set(
    db.playbackSessions
      .filter(
        (session) =>
          session.userId &&
          Date.now() - new Date(session.lastSeenAt).getTime() <= 30 * 86400000,
      )
      .map((session) => session.userId),
  ).size;
  const canManage = user.roles.includes('admin') || user.roles.includes('super_admin');

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            {ar ? 'مركز العمليات' : 'OPERATIONS CENTER'}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">
            {ar ? 'نظرة عامة على المنصة' : 'Platform overview'}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {ar
              ? 'البيانات مأخوذة من قاعدة البيانات وقت فتح الصفحة، وليست تحديثًا لحظيًا.'
              : 'Snapshot from the database at page load; not a live feed.'}
          </p>
        </div>
        <Link
          href={`/${locale}/admin/review`}
          className="rounded-xl border border-primary/40 bg-primary/15 px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-primary/25"
        >
          {ar ? 'افتح قائمة المراجعة ←' : 'Open review queue →'}
        </Link>
      </div>

      <section
        aria-label={ar ? 'الطلبات المعلقة' : 'Pending queues'}
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={`/${locale}/admin/${tile.href}`}
            className="group rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-primary/50 hover:bg-primary/10"
          >
            <p className="text-xs font-semibold text-muted">{tile.label}</p>
            <p className="mt-3 text-3xl font-black tabular-nums text-ink">
              {formatNumber(tile.value, locale)}
            </p>
            <p className="mt-3 text-xs font-semibold text-primary group-hover:underline">
              {ar ? 'عرض الطلبات ←' : 'View queue →'}
            </p>
          </Link>
        ))}
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <h3 className="font-bold text-ink">
                {ar ? 'المهام التي تحتاج متابعة' : 'Action required'}
              </h3>
              <p className="mt-1 text-xs text-muted">
                {ar
                  ? 'مرتبة حسب وقت الانتظار؛ أكثر من 48 ساعة تعتبر متأخرة.'
                  : 'Ordered by age; items older than 48 hours are flagged overdue.'}
              </p>
            </div>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
              {formatNumber(tasks.length, locale)}
            </span>
          </div>
          {tasks.length === 0 ? (
            <p className="p-6 text-sm text-muted">
              {ar ? 'لا توجد مهام معلقة حاليًا.' : 'No pending tasks right now.'}
            </p>
          ) : (
            <div className="divide-y divide-white/10">
              {tasks.slice(0, 8).map((task) => (
                <Link
                  key={task.id}
                  href={task.href}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-primary">
                        {task.label}
                      </span>
                      {ageHours(task.createdAt) >= 48 && (
                        <span className="rounded-md bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          {ar ? 'متأخر' : 'Overdue'}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-ink">
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {task.detail} · {formatDate(task.createdAt, locale)}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-primary">
                    {ar ? 'مراجعة ←' : 'Review →'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
        <div className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <h3 className="font-bold text-ink">
              {ar ? 'مؤشرات المنصة' : 'Platform at a glance'}
            </h3>
            <p className="mt-1 text-xs text-muted">
              {ar
                ? 'إجماليات ما لم يُذكر خلاف ذلك'
                : 'All-time totals unless stated otherwise'}
            </p>
            <dl className="mt-4 space-y-3">
              {[
                [ar ? 'الحسابات المسجلة' : 'Registered accounts', data.stats.users],
                [
                  ar ? 'الأغاني المنشورة' : 'Published tracks',
                  data.stats.publishedTracks,
                ],
                [ar ? 'الاستماعات المؤهلة' : 'Qualified plays', totalQualified],
                [
                  ar
                    ? 'مستمعون مسجلون خلال 30 يومًا'
                    : 'Registered listeners · last 30 days',
                  registeredListeners,
                ],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 text-sm"
                >
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-bold tabular-nums text-ink">
                    {formatNumber(Number(value), locale)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.045] p-5">
            <h3 className="font-bold text-ink">
              {ar ? 'حالة الخدمات' : 'Service health'}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {ar
                ? 'مراقبة الخدمات المباشرة غير متصلة بعد. لا يتم عرض حالة تشغيل افتراضية أو تقدير استهلاك التخزين.'
                : 'Live service monitoring is not connected yet. No invented uptime or storage usage is shown.'}
            </p>
          </section>
          {canManage && (
            <Link
              href={`/${locale}/admin/audit`}
              className="block rounded-xl border border-white/10 bg-white/[0.035] px-5 py-4 text-sm font-bold text-primary hover:bg-white/5"
            >
              {ar ? 'عرض سجل العمليات الإدارية ←' : 'View staff audit log →'}
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {[
          {
            title: ar ? 'أكثر الأنواع نشرًا' : 'Top published genres',
            entries: data.genreCounts,
          },
          {
            title: ar ? 'توزيع الأغاني حسب الدولة' : 'Published tracks by country',
            entries: data.countryCounts,
          },
        ].map((group) => (
          <section
            key={group.title}
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
          >
            <h3 className="mb-4 font-bold text-ink">{group.title}</h3>
            {group.entries.length ? (
              group.entries.slice(0, 6).map((entry) => (
                <div
                  key={entry.label}
                  className="flex justify-between gap-3 border-b border-white/5 py-2 text-sm"
                >
                  <span className="text-muted">{entry.label}</span>
                  <span className="font-semibold tabular-nums text-ink">
                    {formatNumber(entry.count, locale)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">
                {ar ? 'لا توجد بيانات بعد.' : 'No data yet.'}
              </p>
            )}
          </section>
        ))}
      </div>
      {canManage && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-ink">
              {ar ? 'آخر إجراءات الفريق' : 'Recent staff activity'}
            </h3>
            <Link
              href={`/${locale}/admin/audit`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {ar ? 'عرض الكل' : 'View all'}
            </Link>
          </div>
          {data.auditLogs.length ? (
            data.auditLogs.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap justify-between gap-2 border-b border-white/5 py-3 text-xs"
              >
                <div>
                  <p className="font-semibold text-ink">{entry.action}</p>
                  <p className="mt-1 text-muted">
                    {entry.actorName} · {entry.entityType}
                  </p>
                </div>
                <time className="text-muted">{formatDate(entry.createdAt, locale)}</time>
              </div>
            ))
          ) : (
            <p className="mt-4 text-sm text-muted">
              {ar ? 'لا توجد عمليات مسجلة.' : 'No recorded activity.'}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
