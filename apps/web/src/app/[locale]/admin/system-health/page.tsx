import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase, serviceClient } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { isLocale } from '@/i18n/config';
import { RetryMediaJobButton } from '@/components/admin/RetryMediaJobButton';

export const dynamic = 'force-dynamic';

export default async function SystemHealthPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  if (!user.roles.includes('admin') && !user.roles.includes('super_admin')) {
    redirect(`/${locale}/admin`);
  }
  const ar = locale === 'ar';
  const checkedAt = new Date();
  let database: 'reachable' | 'unavailable' = 'unavailable';
  let uploads24h: number | null = null;
  let playback24h: number | null = null;
  let queuedTracks: number | null = null;
  try {
    const db = demoMode ? readDb() : await loadDbFromSupabase();
    database = 'reachable';
    const cutoff = checkedAt.getTime() - 24 * 60 * 60 * 1000;
    uploads24h = db.uploadEvents.filter(
      (event) => new Date(event.createdAt).getTime() >= cutoff,
    ).length;
    playback24h = db.playbackEvents.filter(
      (event) => new Date(event.occurredAt).getTime() >= cutoff,
    ).length;
    queuedTracks = db.tracks.filter(
      (track) => track.publishStatus !== 'published',
    ).length;
  } catch {
    // Keep the diagnostic page accessible even when its database is unavailable.
  }
  let mediaJobs: {
    queued: number;
    running: number;
    failed: number;
    dead: number;
    stale: number;
  } | null = null;
  if (!demoMode) {
    try {
      const { data, error } = await serviceClient()
        .from('jobs')
        .select('state,updated_at')
        .eq('type', 'media.transcode')
        .in('state', ['queued', 'running', 'failed', 'dead'])
        .limit(1000);
      if (error) throw error;
      const jobs = data ?? [];
      const cutoff = checkedAt.getTime() - 20 * 60_000;
      mediaJobs = {
        queued: jobs.filter((job) => job.state === 'queued').length,
        running: jobs.filter((job) => job.state === 'running').length,
        failed: jobs.filter((job) => job.state === 'failed').length,
        dead: jobs.filter((job) => job.state === 'dead').length,
        stale: jobs.filter(
          (job) => job.state === 'running' && Date.parse(job.updated_at) < cutoff,
        ).length,
      };
    } catch {
      // Unknown is safer than reporting a healthy queue when the query fails.
    }
  }
  let problemJobs: Array<{
    id: string;
    state: string;
    attempts: number;
    max_attempts: number;
    updated_at: string;
    last_error: string | null;
  }> | null = null;
  if (!demoMode) {
    try {
      const { data, error } = await serviceClient()
        .from('jobs')
        .select('id,state,attempts,max_attempts,updated_at,last_error')
        .eq('type', 'media.transcode')
        .in('state', ['failed', 'dead', 'running'])
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const staleCutoff = checkedAt.getTime() - 20 * 60_000;
      problemJobs = (data ?? []).filter(
        (job) => job.state !== 'running' || Date.parse(job.updated_at) < staleCutoff,
      );
    } catch {
      // Keep diagnostics read-only and distinguish unknown from no failures.
    }
  }
  const metrics = [
    {
      en: 'Database read',
      ar: 'قراءة قاعدة البيانات',
      value:
        database === 'reachable'
          ? ar
            ? 'متاح'
            : 'Reachable'
          : ar
            ? 'غير متاح'
            : 'Unavailable',
    },
    { en: 'Uploads (24h)', ar: 'عمليات الرفع (24 ساعة)', value: uploads24h },
    { en: 'Playback events (24h)', ar: 'أحداث التشغيل (24 ساعة)', value: playback24h },
    { en: 'Not yet published tracks', ar: 'أغانٍ لم تُنشر بعد', value: queuedTracks },
  ];
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          SYSTEM &amp; SECURITY
        </p>
        <h2 className="mt-2 text-2xl font-bold text-ink">
          {ar ? 'حالة النظام' : 'System health'}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {ar
            ? 'مؤشرات تشخيصية عند تحميل الصفحة، وليست مراقبة لحظية للخدمات.'
            : 'Point-in-time diagnostics, not live infrastructure monitoring.'}
        </p>
        <p className="mt-1 text-xs text-muted">
          {ar ? 'وقت الفحص:' : 'Checked:'} {checkedAt.toISOString()}
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.en} className="card p-5">
            <p className="text-sm text-muted">{ar ? metric.ar : metric.en}</p>
            <p className="mt-3 text-2xl font-bold text-ink">{metric.value ?? '—'}</p>
          </div>
        ))}
      </div>
      <section className="space-y-3">
        <h3 className="text-lg font-bold text-ink">
          {ar ? 'معالجة الصوت' : 'Audio processing queue'}
        </h3>
        <p className="text-sm text-muted">
          {ar
            ? 'لقطة من أول 1000 مهمة معالجة؛ لا تعني أن العامل يعمل حاليًا.'
            : 'Snapshot of up to 1,000 media jobs; does not confirm the worker is online.'}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              ['queued', ar ? 'في الانتظار' : 'Queued'],
              ['running', ar ? 'قيد المعالجة' : 'Running'],
              ['failed', ar ? 'فشلت ويمكن إعادة محاولتها' : 'Retryable failures'],
              ['dead', ar ? 'فشلت نهائيًا' : 'Exhausted retries'],
              ['stale', ar ? 'مهام متوقفة أكثر من 20 دقيقة' : 'Stale >20 min'],
            ] as const
          ).map(([key, label]) => (
            <div
              key={key}
              className={`rounded-xl border p-4 ${mediaJobs && mediaJobs[key] > 0 && (key === 'dead' || key === 'stale') ? 'border-red-400/40 bg-red-500/10' : 'border-white/10 bg-white/5'}`}
            >
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-2 text-2xl font-bold text-ink">
                {mediaJobs?.[key] ?? '—'}
              </p>
            </div>
          ))}
        </div>
        {!mediaJobs && (
          <p role="status" className="text-sm text-amber-300">
            {ar
              ? 'بيانات قائمة المعالجة غير متاحة حاليًا.'
              : 'Processing queue data is currently unavailable.'}
          </p>
        )}
      </section>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-ink">
            {ar ? 'تفاصيل المهام المتعثرة' : 'Problem job diagnostics'}
          </h3>
          <Link
            href={`/${locale}/admin/audit?q=media.retry_requested`}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {ar ? 'سجل إعادة المحاولات' : 'Retry history'}
          </Link>
        </div>
        <p className="text-sm text-muted">
          {ar
            ? 'أحدث 50 مهمة فاشلة أو قيد التشغيل؛ تُعرض المهام المتوقفة فقط من حالات التشغيل. لا تُعرض رسائل الأخطاء الداخلية.'
            : 'Up to 50 recent failed or running jobs; running jobs appear only when stale. Internal error messages are not exposed.'}
        </p>
        {problemJobs === null ? (
          <p role="status" className="text-sm text-amber-300">
            {ar ? 'تفاصيل المهام غير متاحة.' : 'Job details are unavailable.'}
          </p>
        ) : problemJobs.length === 0 ? (
          <p className="text-sm text-muted">
            {ar
              ? 'لا توجد مهام متعثرة في النتائج الأخيرة.'
              : 'No problem jobs in the latest results.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[640px] text-start text-sm">
              <thead className="bg-white/5 text-muted">
                <tr>
                  <th scope="col" className="p-3 text-start">
                    {ar ? 'معرّف المهمة' : 'Job ID'}
                  </th>
                  <th scope="col" className="p-3 text-start">
                    {ar ? 'الحالة' : 'State'}
                  </th>
                  <th scope="col" className="p-3 text-start">
                    {ar ? 'المحاولات' : 'Attempts'}
                  </th>
                  <th scope="col" className="p-3 text-start">
                    {ar ? 'آخر تحديث' : 'Updated'}
                  </th>
                  <th scope="col" className="p-3 text-start">
                    {ar ? 'الإجراء' : 'Action'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {problemJobs.map((job) => (
                  <tr key={job.id} className="border-t border-white/10">
                    <td className="p-3 font-mono text-xs">{job.id}</td>
                    <td className="p-3">
                      {job.state === 'running'
                        ? ar
                          ? 'متوقفة'
                          : 'Stale'
                        : job.state === 'dead'
                          ? ar
                            ? 'استنفدت المحاولات'
                            : 'Exhausted'
                          : ar
                            ? 'فشلت'
                            : 'Failed'}
                    </td>
                    <td className="p-3">
                      {job.attempts} / {job.max_attempts}
                    </td>
                    <td className="p-3">
                      <time dateTime={job.updated_at}>{job.updated_at}</time>
                    </td>
                    <td className="p-3">
                      {job.state === 'failed' && job.attempts < job.max_attempts ? (
                        <RetryMediaJobButton jobId={job.id} ar={ar} />
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted">
        {ar
          ? 'نجاح قراءة قاعدة البيانات لا يؤكد حالة معالجة الصوت أو التخزين أو توفر الخدمات الخارجية. يلزم إضافة فحوص مستقلة لهذه الخدمات.'
          : 'A successful database read does not verify audio processing, storage, or external service availability. Those require separate health checks.'}
      </p>
    </div>
  );
}
