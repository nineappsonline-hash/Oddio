import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { formatNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ListeningAnalytics({
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
  if (!user.roles.some((role) => role === 'admin' || role === 'super_admin'))
    redirect(`/${locale}`);
  const { days: requestedDays } = await searchParams;
  const days = requestedDays === '7' ? 7 : 30;
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const ar = locale === 'ar';
  const today = new Date();
  const utcToday = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const start = utcToday - (days - 1) * 86400000;
  const events = db.playbackEvents.filter((event) => {
    const time = Date.parse(event.occurredAt);
    return Number.isFinite(time) && time >= start && time < utcToday + 86400000;
  });
  const sessions = new Map(db.playbackSessions.map((session) => [session.id, session]));
  const qualified = events.filter((event) => event.qualified);
  const activeSessions = new Set(events.map((event) => event.sessionId)).size;
  const registeredListeners = new Set(
    events.map((event) => sessions.get(event.sessionId)?.userId).filter(Boolean),
  ).size;
  const dates = Array.from({ length: days }, (_, index) =>
    new Date(start + index * 86400000).toISOString().slice(0, 10),
  );
  const perDay = new Map(
    dates.map((date) => [date, { events: 0, qualified: 0, sessions: new Set<string>() }]),
  );
  for (const event of events) {
    const bucket = perDay.get(event.occurredAt.slice(0, 10));
    if (!bucket) continue;
    bucket.events++;
    if (event.qualified) bucket.qualified++;
    bucket.sessions.add(event.sessionId);
  }
  const trackNames = new Map(db.tracks.map((track) => [track.id, track.title]));
  const byTrack = new Map<string, number>();
  for (const event of qualified)
    byTrack.set(event.trackId, (byTrack.get(event.trackId) ?? 0) + 1);
  const topTracks = [...byTrack].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const metrics = [
    [ar ? 'أحداث التشغيل المسجلة' : 'Recorded playback events', events.length],
    [ar ? 'أحداث تشغيل مؤهلة' : 'Qualified playback events', qualified.length],
    [ar ? 'جلسات تشغيل نشطة' : 'Distinct playback sessions', activeSessions],
    [ar ? 'مستمعون مسجلون' : 'Signed-in listeners', registeredListeners],
  ] as const;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <Link
          href={`/${locale}/admin/analytics`}
          className="text-xs font-semibold text-primary"
        >
          {ar ? '← التحليلات' : '← Analytics'}
        </Link>
        <h1 className="mt-3 text-2xl font-black text-ink">
          {ar ? 'تحليلات الاستماع' : 'Listening analytics'}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {ar
            ? 'بيانات أحداث التشغيل المسجلة بالتوقيت العالمي UTC، وليست تقديرات.'
            : 'Recorded playback events grouped by UTC day; no estimated values.'}
        </p>
        <div className="mt-4 flex gap-2">
          {[7, 30].map((option) => (
            <Link
              key={option}
              href={`/${locale}/admin/analytics/listening?days=${option}`}
              aria-current={days === option ? 'page' : undefined}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold ${days === option ? 'border-primary bg-primary/15 text-ink' : 'border-white/10 text-muted'}`}
            >
              {option} {ar ? 'يوم' : 'days'}
            </Link>
          ))}
        </div>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-3 text-3xl font-black tabular-nums text-ink">
              {formatNumber(value, locale)}
            </p>
          </div>
        ))}
      </section>
      <section className="card overflow-x-auto p-5">
        <h2 className="mb-4 text-lg font-bold text-ink">
          {ar ? 'الأحداث حسب اليوم' : 'Daily event breakdown'}
        </h2>
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs text-muted">
              <th className="py-3 text-start">{ar ? 'التاريخ UTC' : 'UTC date'}</th>
              <th className="py-3 text-end">{ar ? 'الأحداث' : 'Events'}</th>
              <th className="py-3 text-end">{ar ? 'المؤهلة' : 'Qualified'}</th>
              <th className="py-3 text-end">{ar ? 'الجلسات' : 'Sessions'}</th>
            </tr>
          </thead>
          <tbody>
            {[...dates].reverse().map((date) => {
              const row = perDay.get(date)!;
              return (
                <tr key={date} className="border-b border-white/5">
                  <td className="py-2 text-ink">{date}</td>
                  <td className="py-2 text-end tabular-nums">
                    {formatNumber(row.events, locale)}
                  </td>
                  <td className="py-2 text-end tabular-nums">
                    {formatNumber(row.qualified, locale)}
                  </td>
                  <td className="py-2 text-end tabular-nums">
                    {formatNumber(row.sessions.size, locale)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="card p-5">
        <h2 className="mb-4 text-lg font-bold text-ink">
          {ar
            ? 'أكثر الأغاني بأحداث مؤهلة خلال الفترة'
            : 'Top tracks by qualified events in this period'}
        </h2>
        {topTracks.length === 0 ? (
          <p className="text-sm text-muted">
            {ar
              ? 'لا توجد أحداث مؤهلة في الفترة المحددة.'
              : 'No qualified events in this period.'}
          </p>
        ) : (
          topTracks.map(([id, count], index) => (
            <div
              key={id}
              className="flex justify-between gap-3 border-b border-white/5 py-3 text-sm"
            >
              <span className="min-w-0 truncate text-ink">
                {index + 1}. {trackNames.get(id) ?? id}
              </span>
              <span className="font-bold tabular-nums">
                {formatNumber(count, locale)}
              </span>
            </div>
          ))
        )}
      </section>
      <aside className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.045] p-5 text-sm text-muted">
        {ar
          ? 'الأحداث ليست بالضرورة استماعات فريدة؛ قد تسجل الجلسة عدة أحداث. لا يتم عرض معدل الإكمال أو الاحتفاظ لأن تعريفهما والتحقق من تغطية البيانات لم يكتمل بعد. النتائج تعتمد على سجلات الأحداث المتاحة في قاعدة البيانات.'
          : 'Events are not unique plays: one session can produce multiple events. Completion and retention are omitted until definitions and event coverage are validated. Results reflect events currently available in the database.'}
      </aside>
    </div>
  );
}
