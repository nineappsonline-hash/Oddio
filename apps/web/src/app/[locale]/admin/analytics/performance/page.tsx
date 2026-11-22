import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { serviceClient } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';

export const dynamic = 'force-dynamic';

type SummaryRow = {
  metric: string;
  device_group: string;
  page_group: string;
  browser_group: string;
  sample_count: number;
  p50: string | number | null;
  p75: string | number | null;
  p95: string | number | null;
};

const names: Record<string, [string, string]> = {
  lcp: ['أكبر محتوى ظاهر (LCP)', 'Largest Contentful Paint'],
  cls: ['ثبات الصفحة (CLS)', 'Cumulative Layout Shift'],
  fcp: ['أول ظهور للمحتوى (FCP)', 'First Contentful Paint'],
  long_task: ['عمليات المعالج الثقيلة', 'Main-thread long tasks'],
  audio_startup: ['زمن بدء الصوت', 'Audio startup latency'],
  audio_rebuffer: ['مدة التقطيع', 'Audio buffering duration'],
};

export default async function MobilePerformancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') redirect('/en');
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  if (!user.roles.some((role) => role === 'admin' || role === 'super_admin')) {
    redirect(`/${locale}`);
  }
  const ar = locale === 'ar';
  const { days: daysParam } = await searchParams;
  const days = daysParam === '30' ? 30 : 7;
  let error = false;
  let rows: SummaryRow[] = [];
  if (!demoMode) {
    try {
      const result = await serviceClient().rpc('oddio_performance_summary', {
        p_days: days,
      });
      if (result.error) throw result.error;
      rows = (result.data ?? []) as SummaryRow[];
    } catch {
      error = true;
    }
  }
  const fmt = (value: string | number | null, metric: string) => {
    const parsed = Number(value);
    if (value == null || !Number.isFinite(parsed)) return '—';
    if (metric === 'cls') return parsed.toFixed(3);
    if (metric === 'long_task') return parsed.toFixed(1);
    return `${Math.round(parsed).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')} ms`;
  };
  const count = rows.reduce((sum, row) => sum + Number(row.sample_count || 0), 0);
  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <Link
          href={`/${locale}/admin/analytics`}
          className="text-xs font-semibold text-primary"
        >
          {ar ? '← التحليلات' : '← Analytics'}
        </Link>
        <h1 className="mt-3 text-2xl font-black text-ink">
          {ar ? 'أداء الموقع والمشغل' : 'Site & Player Performance'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {ar
            ? 'قياسات فعلية مجمّعة من عينة 5٪ من زيارات المتصفح. مفيش بيانات شخصية أو أسماء أغاني. عرض الـ P75 يوضح التجربة المتوسطة للأسوأ نسبيًا؛ وعدد العينات مهم لتقييم النتائج.'
            : 'Anonymous measurements sampled from 5% of browser visits. No personal data, track names or user identifiers. P75 highlights slower typical experiences; sample count matters.'}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[7, 30].map((option) => (
            <Link
              key={option}
              href={`/${locale}/admin/analytics/performance?days=${option}`}
              aria-current={days === option ? 'page' : undefined}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                days === option
                  ? 'border-primary bg-primary/15 text-ink'
                  : 'border-white/15 text-muted hover:bg-white/10'
              }`}
            >
              {option} {ar ? 'يوم' : 'days'}
            </Link>
          ))}
          <span className="ms-auto text-xs text-muted">
            {ar ? 'إجمالي عينات القياس' : 'Total metric samples'}:{' '}
            {count.toLocaleString('en-US')}
          </span>
        </div>
      </header>
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-400/25 bg-red-950/20 p-5 text-sm text-red-200"
        >
          {ar
            ? 'تعذر تحميل قياسات الأداء حاليًا.'
            : 'Performance measurements are unavailable right now.'}
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-muted">
          {ar
            ? 'مفيش عينات متاحة للفترة دي لسه. النتائج هتظهر بعد وجود زيارات فعلية للموقع.'
            : 'No measurements collected in this window yet. Results will appear after real visitor traffic.'}
        </div>
      ) : (
        <section className="card overflow-x-auto p-5">
          <h2 className="mb-4 text-lg font-bold text-ink">
            {ar
              ? 'القياسات حسب الجهاز والمتصفح والصفحة'
              : 'Metrics by device, browser and page'}
          </h2>
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-muted">
                <th className="py-3 text-start">{ar ? 'المقياس' : 'Metric'}</th>
                <th className="py-3 text-start">{ar ? 'الجهاز' : 'Device'}</th>
                <th className="py-3 text-start">{ar ? 'المتصفح' : 'Browser'}</th>
                <th className="py-3 text-start">{ar ? 'الصفحة' : 'Page'}</th>
                <th className="py-3 text-end">{ar ? 'العينات' : 'Samples'}</th>
                <th className="py-3 text-end">P50</th>
                <th className="py-3 text-end">P75</th>
                <th className="py-3 text-end">P95</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.metric}:${row.device_group}:${row.browser_group}:${row.page_group}`}
                  className="border-b border-white/5"
                >
                  <td className="py-3 pe-3 font-semibold text-ink">
                    {(names[row.metric] ?? [row.metric, row.metric])[ar ? 0 : 1]}
                  </td>
                  <td className="py-3 pe-2 text-muted">{row.device_group}</td>
                  <td className="py-3 pe-2 text-muted">{row.browser_group}</td>
                  <td className="py-3 pe-2 text-muted">{row.page_group}</td>
                  <td className="py-3 text-end tabular-nums">{row.sample_count}</td>
                  <td className="py-3 text-end tabular-nums">
                    {fmt(row.p50, row.metric)}
                  </td>
                  <td className="py-3 text-end tabular-nums font-semibold text-primary">
                    {fmt(row.p75, row.metric)}
                  </td>
                  <td className="py-3 text-end tabular-nums">
                    {fmt(row.p95, row.metric)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <p className="text-xs leading-5 text-muted">
        {ar
          ? 'LCP/FCP وزمن بدء الصوت والتقطيع بالمللي ثانية، CLS بدون وحدة، وLong Tasks عدد عمليات. دي مؤشرات أولية وليست قياس INP الرسمي أو اختبار Safari معملي.'
          : 'LCP/FCP and audio timings are in milliseconds; CLS is unitless and Long Tasks is a count. These are sampled diagnostics, not official INP measurement or a laboratory Safari benchmark.'}
      </p>
    </div>
  );
}
