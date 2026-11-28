import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readRuntimeDb } from '@/lib/data/runtime-store';
import { getHistoryData } from '@/lib/data/queries';
import { qualifiedRecapEvents } from '@/lib/data/monthly-recap';
import { annualListeningDNA } from '@/lib/data/annual-listening-dna';
import { ShareAnnualRewind } from '@/components/library/ShareAnnualRewind';
import { MIN_QUALIFIED_LISTENS_TO_SHARE } from '@/lib/annual-share';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : 'en';
  return buildMetadata({
    locale: safeLocale,
    title: safeLocale === 'ar' ? 'حصاد السنة وبصمتك الموسيقية' : 'Rewind & Music DNA',
    description: 'Your private annual music listening report.',
    path: '/library/rewind',
    noindex: true,
  });
}

export default async function RewindPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const ar = locale === 'ar';
  const currentYear = new Date().getUTCFullYear();
  const { year: requested } = await searchParams;
  const selectedYear =
    typeof requested === 'string' &&
    /^\d{4}$/.test(requested) &&
    Number(requested) >= 2020 &&
    Number(requested) <= currentYear
      ? requested
      : null;
  const year = selectedYear ? Number(selectedYear) : currentYear;
  const user = await getSessionUser();
  if (!user) {
    const next = `/${locale}/library/rewind${selectedYear ? `?year=${selectedYear}` : ''}`;
    redirect(`/${locale}/login?next=${encodeURIComponent(next)}`);
  }
  const db = await readRuntimeDb();
  const allowed = getHistoryData(db, { userId: user.id, roles: user.roles });
  const events = qualifiedRecapEvents(
    allowed,
    db.playbackSessions,
    db.playbackEvents,
    user.id,
  );
  const report = annualListeningDNA(events, year, locale);
  const format = (n: number) => new Intl.NumberFormat(ar ? 'ar-EG' : 'en-US').format(n);
  return (
    <main className="w-full min-w-0 max-w-full space-y-8 pb-20">
      <header className="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-600/15 to-cyan-500/10 p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
          ODDIO REWIND · MUSIC DNA
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">
          {ar ? `حصاد موسيقاك في ${year}` : `Your ${year} Music Rewind`}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {ar
            ? 'إحصائيات خاصة بيك من استماعاتك المؤهلة المسجلة، من غير مشاركة تلقائية.'
            : 'Your private recap of recorded qualified listens. Never shared automatically.'}
        </p>
        <nav
          className="mt-4 flex flex-wrap gap-2"
          aria-label={ar ? 'اختيار السنة' : 'Select year'}
        >
          {[currentYear, currentYear - 1].map((candidate) => (
            <Link
              key={candidate}
              href={`/${locale}/library/rewind?year=${candidate}`}
              aria-current={candidate === year ? 'page' : undefined}
              className={`rounded-full border px-4 py-2 text-sm ${candidate === year ? 'border-primary bg-primary/20 text-white' : 'border-white/20 text-muted'}`}
            >
              {candidate}
            </Link>
          ))}
        </nav>
      </header>
      <section
        className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4"
        aria-label={ar ? 'ملخص السنة' : 'Year summary'}
      >
        {[
          [ar ? 'استماعات مؤهلة' : 'Qualified listens', report.qualifiedListens],
          [ar ? 'أغاني مختلفة' : 'Unique tracks', report.tracks],
          [ar ? 'فنانين' : 'Artists', report.artists],
          [ar ? 'شهور نشطة' : 'Active months', report.activeMonths],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="min-w-0 rounded-2xl border border-white/10 bg-white/[.035] p-4"
          >
            <p className="break-words text-xs text-muted">{label}</p>
            <p className="mt-3 text-2xl font-extrabold tabular-nums">
              {format(Number(value))}
            </p>
          </div>
        ))}
      </section>
      {report.qualifiedListens === 0 ? (
        <div className="rounded-2xl border border-white/10 p-6 text-sm text-muted">
          {ar
            ? 'لسه مفيش استماعات مؤهلة مسجلة للسنة دي.'
            : 'No recorded qualified listens for this year yet.'}
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
            <h2 className="text-xl font-bold">
              {ar ? 'بصمتك الموسيقية · أنواعك المفضلة' : 'Your Music DNA · Top genres'}
            </h2>
            {report.genres.length ? (
              <div className="mt-4 space-y-3">
                {report.genres.map((genre) => (
                  <div key={genre.id}>
                    <div className="flex justify-between gap-4 text-sm">
                      <span>{genre.name}</span>
                      <span>{format(genre.plays)}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                        style={{
                          width: `${(genre.plays / report.qualifiedListens) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">
                {ar
                  ? 'لا توجد تصنيفات معتمدة كفاية لعرض الأنواع.'
                  : 'Not enough catalog genre labels to display a breakdown.'}
              </p>
            )}
          </section>
          <section
            className="rounded-2xl border border-white/10 bg-white/[.035] p-5"
            aria-labelledby="year-months-title"
          >
            <h2 id="year-months-title" className="text-xl font-bold">
              {ar ? 'رحلتك الموسيقية شهر بشهر' : 'Your listening year, month by month'}
            </h2>
            <p className="mt-2 text-xs leading-5 text-muted">
              {ar
                ? 'الأرقام تمثل الاستماعات المؤهلة المسجلة، مش دقائق استماع تقديرية.'
                : 'Counts reflect recorded qualified listens, not estimated listening minutes.'}
            </p>
            <ol
              className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-12"
              aria-label={ar ? 'الاستماعات حسب الشهر' : 'Qualified listens by month'}
            >
              {report.monthlyQualifiedListens.map(({ month, plays }) => {
                const monthLabel = new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-US', {
                  month: 'short',
                  timeZone: 'UTC',
                }).format(new Date(Date.UTC(year, month - 1, 1)));
                const peak = Math.max(
                  1,
                  ...report.monthlyQualifiedListens.map((item) => item.plays),
                );
                return (
                  <li
                    key={month}
                    className="min-w-0 rounded-xl bg-black/20 px-2 py-3 text-center"
                    aria-label={
                      ar
                        ? `${monthLabel}: ${format(plays)} استماع مؤهل`
                        : `${monthLabel}: ${format(plays)} qualified listens`
                    }
                  >
                    <div
                      className="flex h-20 items-end justify-center"
                      aria-hidden="true"
                    >
                      <div
                        className="w-6 rounded-t-md bg-gradient-to-t from-violet-600 to-cyan-400"
                        style={{
                          height: plays ? `${Math.max(6, (plays / peak) * 100)}%` : '2px',
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-ink">{monthLabel}</p>
                    <p className="mt-1 text-xs tabular-nums text-muted">
                      {format(plays)}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
          <section className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: ar ? 'أكثر الأغاني' : 'Top tracks',
                rows: report.topTracks.map((t) => ({
                  id: t.id,
                  name: t.title,
                  detail: t.artist,
                  plays: t.plays,
                })),
              },
              {
                title: ar ? 'أكثر الفنانين' : 'Top artists',
                rows: report.topArtists.map((a) => ({
                  id: a.id,
                  name: a.name,
                  detail: '',
                  plays: a.plays,
                })),
              },
            ].map((group) => (
              <div
                key={group.title}
                className="rounded-2xl border border-white/10 bg-white/[.035] p-5"
              >
                <h2 className="text-xl font-bold">{group.title}</h2>
                <ol className="mt-4 space-y-3">
                  {group.rows.map((item, index) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate">
                        <span className="me-2 text-muted">{index + 1}.</span>
                        {item.name}
                        {item.detail ? (
                          <span className="ms-2 text-muted">· {item.detail}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {format(item.plays)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </section>
        </>
      )}
      {report.qualifiedListens >= MIN_QUALIFIED_LISTENS_TO_SHARE ? (
        <ShareAnnualRewind report={report} locale={locale} />
      ) : report.qualifiedListens > 0 ? (
        <p className="rounded-2xl border border-white/10 p-4 text-sm text-muted">
          {ar
            ? `حصادك يفضل خاص لحد ما تسجل ${MIN_QUALIFIED_LISTENS_TO_SHARE} استماعات مؤهلة على الأقل. تقدر تشوف أرقامك هنا من غير مشاركة.`
            : `You can view your private stats here. Sharing unlocks after at least ${MIN_QUALIFIED_LISTENS_TO_SHARE} recorded qualified listens.`}
        </p>
      ) : null}
      <Link
        href={`/${locale}/library/recap`}
        className="inline-block text-sm text-primary hover:underline"
      >
        {ar ? 'الملخص الشهري ←' : '← Monthly recap'}
      </Link>
    </main>
  );
}
