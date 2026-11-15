import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readRuntimeDb } from '@/lib/data/runtime-store';
import { artistInsights } from '@/lib/data/artist-insights';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : 'en';
  return buildMetadata({
    locale: safeLocale,
    title: safeLocale === 'ar' ? 'تحليلات الفنان' : 'Artist insights',
    description: safeLocale === 'ar' ? 'أداء أغانيك على Oddio' : 'Your music performance on Oddio',
    path: '/studio/insights',
    noindex: true,
  });
}

export default async function ArtistInsightsPage({ params }: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const ar = locale === 'ar';
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  if (!user.isArtistManager) redirect(`/${locale}/apply/artist`);
  const report = artistInsights(await readRuntimeDb(), user.id);
  const number = (value: number) => new Intl.NumberFormat(ar ? 'ar-EG' : 'en-US').format(value);
  const cards = [
    { label: ar ? 'إجمالي الاستماعات المؤهلة' : 'All-time qualified plays', value: report.totalQualifiedPlays },
    { label: ar ? 'آخر 7 أيام' : 'Last 7 days', value: report.sevenDays },
    { label: ar ? 'آخر 30 يوم' : 'Last 30 days', value: report.thirtyDays },
    { label: ar ? 'المتابعين' : 'Followers', value: report.followers },
    { label: ar ? 'الإصدارات المنشورة' : 'Published releases', value: report.released },
    { label: ar ? 'قيد المراجعة' : 'Pending review', value: report.pendingReview },
  ];
  const max = Math.max(1, ...report.daily.map((entry) => entry.qualifiedPlays));
  return (
    <main className="space-y-8 pb-20">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">ODDIO ARTIST STUDIO</p>
        <h1 className="text-3xl font-bold text-ink">{ar ? 'تحليلات أغانيك' : 'Your music insights'}</h1>
        <p className="text-sm text-muted">
          {ar
            ? 'أرقام الاستماع المؤهل فقط. بيانات المستمعين الشخصية مش معروضة.'
            : 'Verified qualified listens only. Individual listener identities are never shown.'}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3" aria-label={ar ? 'ملخص الأداء' : 'Performance summary'}>
        {cards.map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-ink">{number(value)}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <div className="mb-5">
          <h2 className="text-xl font-bold">{ar ? 'الاستماعات اليومية · آخر 30 يوم' : 'Daily listens · last 30 days'}</h2>
          <p className="text-xs text-muted">
            {ar ? 'بيانات فعلية من أحداث الاستماع المسجلة؛ من غير تقديرات.' : 'Recorded qualified playback events, not estimates.'}
          </p>
        </div>
        <div className="flex h-44 items-end gap-1" role="img"
          aria-label={ar ? 'رسم بياني يومي للاستماعات المؤهلة' : 'Daily qualified listening chart'}>
          {report.daily.map((item) => (
            <div key={item.date} className="group flex min-w-0 flex-1 flex-col justify-end"
              title={`${item.date}: ${number(item.qualifiedPlays)}`}>
              <div className="min-h-[2px] rounded-t bg-primary/75 transition-colors group-hover:bg-primary"
                style={{ height: `${Math.max(2, (item.qualifiedPlays / max) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted">
          <span>{report.daily[0]?.date}</span>
          <span>{report.daily[29]?.date}</span>
        </div>
        <p className="mt-3 text-xs text-muted">
          {ar
            ? 'ملحوظة: إجمالي الاستماعات التاريخي ممكن يختلف عن مجموع آخر 30 يوم.'
            : 'Note: all-time track totals may differ from the last 30 days of recorded events.'}
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <div className="mb-5 flex flex-wrap justify-between gap-3">
          <h2 className="text-xl font-bold">{ar ? 'أداء كل أغنية' : 'Track performance'}</h2>
          <Link href={`/${locale}/studio/tracks`} className="text-sm text-primary hover:underline">
            {ar ? 'إدارة الأغاني' : 'Manage tracks'}
          </Link>
        </div>
        {report.tracks.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-start text-sm">
              <thead className="border-b border-white/10 text-xs text-muted">
                <tr>
                  <th scope="col" className="px-2 py-3 text-start">{ar ? 'الأغنية' : 'Track'}</th>
                  <th scope="col" className="px-2 py-3 text-end">{ar ? 'آخر 30 يوم' : 'Last 30 days'}</th>
                  <th scope="col" className="px-2 py-3 text-end">{ar ? 'إجمالي الاستماع' : 'Total plays'}</th>
                  <th scope="col" className="px-2 py-3 text-end">{ar ? 'إعجابات' : 'Likes'}</th>
                  <th scope="col" className="px-2 py-3 text-end">{ar ? 'حالة النشر' : 'Release'}</th>
                </tr>
              </thead>
              <tbody>
                {report.tracks.map((track) => (
                  <tr key={track.id} className="border-b border-white/5">
                    <td className="max-w-60 truncate px-2 py-3 font-medium">{track.title}</td>
                    <td className="px-2 py-3 text-end tabular-nums">{number(track.recentQualifiedPlays)}</td>
                    <td className="px-2 py-3 text-end tabular-nums">{number(track.qualifiedPlays)}</td>
                    <td className="px-2 py-3 text-end tabular-nums">{number(track.likeCount ?? 0)}</td>
                    <td className="px-2 py-3 text-end text-xs text-muted">{track.publishStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">
            {ar ? 'ارفع أول أغنية عشان يظهر أداءها هنا.' : 'Upload your first track to see its performance.'}
          </p>
        )}
      </section>
    </main>
  );
}
