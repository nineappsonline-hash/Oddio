import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readRuntimeDb } from '@/lib/data/runtime-store';
import { getHistoryData } from '@/lib/data/queries';
import { monthlyListeningRecap, qualifiedRecapEvents } from '@/lib/data/monthly-recap';
import { ShareRecap } from '@/components/library/ShareRecap';
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
    title: safeLocale === 'ar' ? 'ملخص استماعك الشهري' : 'Your monthly listening recap',
    description: safeLocale === 'ar' ? 'ملخص الموسيقى اللي سمعتها' : 'Your private music recap',
    path: '/library/recap',
    noindex: true,
  });
}

export default async function RecapPage({ params }: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const ar = locale === 'ar';
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/library/recap`);
  const db = await readRuntimeDb();
  const now = new Date();
  const history = getHistoryData(db, { userId: user.id, roles: user.roles });
  const listens = qualifiedRecapEvents(history, db.playbackSessions, db.playbackEvents, user.id);
  const summary = monthlyListeningRecap(listens, now.getUTCFullYear(), now.getUTCMonth() + 1);
  const monthLabel = new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-US', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(now);
  const number = (value: number) =>
    new Intl.NumberFormat(ar ? 'ar-EG' : 'en-US').format(value);
  return (
    <main className="space-y-8 pb-20">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">YOUR ODDIO RECAP</p>
        <h1 className="text-3xl font-extrabold">{ar ? 'ملخص استماعك' : 'Your monthly recap'}</h1>
        <p className="text-sm text-muted">{monthLabel}</p>
        <p className="text-xs text-muted">
          {ar
            ? 'المعلومات خاصة بحسابك، ومش بتتنشر إلا لو اخترت المشاركة بنفسك.'
            : 'Your listening summary is private unless you choose to share it.'}
        </p>
      </header>
      <section className="grid grid-cols-3 gap-3" aria-label={ar ? 'إحصائيات الاستماع' : 'Listening statistics'}>
        {[
          { label: ar ? 'استماعات' : 'Qualified listens', value: summary.qualifiedListens },
          { label: ar ? 'أغاني' : 'Tracks', value: summary.uniqueTracks },
          { label: ar ? 'فنانين' : 'Artists', value: summary.uniqueArtists },
        ].map((entry) => (
          <div key={entry.label} className="min-w-0 rounded-2xl border border-white/10 bg-white/[.035] p-3 sm:p-5">
            <p className="break-words text-xs text-muted">{entry.label}</p>
            <p className="mt-2 text-xl font-extrabold tabular-nums sm:text-3xl">{number(entry.value)}</p>
          </div>
        ))}
      </section>
      {summary.qualifiedListens ? (
        <>
          <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
            <h2 className="mb-4 text-xl font-bold">{ar ? 'الأغاني الأكثر استماعًا' : 'Your top tracks'}</h2>
            <ol className="space-y-3">
              {summary.topTracks.map((track, index) => (
                <li key={track.id} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <span className="min-w-0 truncate text-sm">
                    <span className="me-3 text-muted">{index + 1}.</span>
                    <strong>{track.title}</strong>
                    <span className="ms-2 text-muted">· {track.artist}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">{number(track.plays)} {ar ? 'مرة' : 'plays'}</span>
                </li>
              ))}
            </ol>
          </section>
          <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
            <h2 className="mb-4 text-xl font-bold">{ar ? 'الفنانين المفضلين' : 'Top artists'}</h2>
            <ol className="space-y-2">
              {summary.topArtists.map((artist, index) => (
                <li key={artist.id} className="flex justify-between gap-3 text-sm">
                  <span className="truncate">{index + 1}. {artist.name}</span>
                  <span className="shrink-0 text-muted">{number(artist.plays)}</span>
                </li>
              ))}
            </ol>
          </section>
          <ShareRecap locale={locale} monthLabel={monthLabel}
            listens={summary.qualifiedListens} tracks={summary.uniqueTracks}
            artists={summary.uniqueArtists} />
        </>
      ) : (
        <section className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
          <p className="text-sm text-muted">
            {ar ? 'لسه مفيش استماعات مؤهلة مسجلة للشهر ده.' : 'No qualified listens recorded this month yet.'}
          </p>
          <Link href={`/${locale}/discover`} className="mt-3 inline-block text-sm text-primary hover:underline">
            {ar ? 'اكتشف موسيقى' : 'Discover music'}
          </Link>
        </section>
      )}
      <p className="text-xs text-muted">
        {ar
          ? 'الأرقام مبنية على الاستماعات المسجلة المتاحة في مكتبتك، وليست دقائق تشغيل مقدّرة.'
          : 'These figures use accessible recorded listening history, not estimated listening minutes.'}
      </p>
    </main>
  );
}
