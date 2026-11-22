import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { formatNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') redirect('/en');
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  if (!user.roles.some((role) => role === 'admin' || role === 'super_admin'))
    redirect(`/${locale}`);

  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const ar = locale === 'ar';
  const now = Date.now();
  const last30 = now - 30 * 86400000;
  const last7 = now - 7 * 86400000;
  const published = db.tracks.filter((track) => track.publishStatus === 'published');
  const sessions30 = db.playbackSessions.filter(
    (session) => new Date(session.lastSeenAt).getTime() >= last30,
  );
  const sessions7 = sessions30.filter(
    (session) => new Date(session.lastSeenAt).getTime() >= last7,
  );
  const listeners30 = new Set(sessions30.map((session) => session.userId).filter(Boolean))
    .size;
  const listeners7 = new Set(sessions7.map((session) => session.userId).filter(Boolean))
    .size;
  const totalPlays = published.reduce((sum, track) => sum + track.qualifiedPlays, 0);
  const artistNames = new Map(db.artists.map((artist) => [artist.id, artist.name]));
  const topTracks = [...published]
    .sort((a, b) => b.qualifiedPlays - a.qualifiedPlays)
    .slice(0, 10);
  const artistTotals = new Map<string, { name: string; plays: number; tracks: number }>();
  for (const track of published) {
    const current = artistTotals.get(track.artistId) ?? {
      name: artistNames.get(track.artistId) ?? track.artistId,
      plays: 0,
      tracks: 0,
    };
    current.plays += track.qualifiedPlays;
    current.tracks++;
    artistTotals.set(track.artistId, current);
  }
  const topArtists = [...artistTotals.values()]
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 10);
  const metrics = [
    {
      label: ar ? 'المستخدمون المسجلون' : 'Registered accounts',
      value: db.users.length,
      note: ar ? 'إجمالي الحسابات' : 'All time',
    },
    {
      label: ar ? 'الأغاني المنشورة' : 'Published tracks',
      value: published.length,
      note: ar ? 'حاليًا' : 'Current catalog',
    },
    {
      label: ar ? 'الاستماعات المؤهلة' : 'Qualified plays',
      value: totalPlays,
      note: ar ? 'إجمالي تراكمي للأغاني المنشورة' : 'All-time track counters',
    },
    {
      label: ar ? 'مستمعون مسجلون — 7 أيام' : 'Registered listeners · 7d',
      value: listeners7,
      note: ar ? 'حسب جلسات التشغيل المحملة' : 'From loaded playback sessions',
    },
    {
      label: ar ? 'مستمعون مسجلون — 30 يومًا' : 'Registered listeners · 30d',
      value: listeners30,
      note: ar ? 'حسب جلسات التشغيل المحملة' : 'From loaded playback sessions',
    },
  ];
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <Link href={`/${locale}/admin`} className="text-xs font-semibold text-primary">
          {ar ? '← مركز التحكم' : '← Command Center'}
        </Link>
        <h1 className="mt-3 text-2xl font-black text-ink">
          {ar ? 'تحليلات المنصة' : 'Platform analytics'}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {ar
            ? 'لقطة من قاعدة البيانات عند فتح الصفحة. لا توجد تقديرات أو أرقام تجريبية في وضع الإنتاج.'
            : 'Database snapshot at page load. No estimated figures in production mode.'}
        </p>
        <Link
          href={`/${locale}/admin/analytics/performance`}
          className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20"
        >
          {ar ? 'أداء الموقع والمشغل ←' : 'Site & Player Performance →'}
        </Link>
      </header>
      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        aria-label={ar ? 'مؤشرات الأداء' : 'Performance metrics'}
      >
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-white/10 bg-white/[0.045] p-5"
          >
            <p className="text-xs text-muted">{metric.label}</p>
            <p className="mt-3 text-3xl font-black tabular-nums text-ink">
              {formatNumber(metric.value, locale)}
            </p>
            <p className="mt-2 text-xs text-muted">{metric.note}</p>
          </div>
        ))}
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <h2 className="mb-2 text-lg font-bold text-ink">
            {ar ? 'أكثر الأغاني استماعًا' : 'Top tracks by qualified plays'}
          </h2>
          <p className="mb-4 text-xs text-muted">
            {ar
              ? 'إجمالي تراكمي، وليس آخر 30 يومًا.'
              : 'All-time counters, not a 30-day ranking.'}
          </p>
          {topTracks.length === 0 ? (
            <p className="text-sm text-muted">
              {ar ? 'لا توجد أغاني منشورة.' : 'No published tracks.'}
            </p>
          ) : (
            topTracks.map((track, i) => (
              <div
                key={track.id}
                className="flex items-center justify-between gap-3 border-b border-white/5 py-3 text-sm"
              >
                <div className="min-w-0">
                  <span className="me-2 text-xs text-muted">{i + 1}.</span>
                  <span className="font-semibold text-ink">{track.title}</span>
                  <p className="mt-1 text-xs text-muted">
                    {artistNames.get(track.artistId) ?? '—'}
                  </p>
                </div>
                <span className="shrink-0 font-bold tabular-nums text-ink">
                  {formatNumber(track.qualifiedPlays, locale)}
                </span>
              </div>
            ))
          )}
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <h2 className="mb-2 text-lg font-bold text-ink">
            {ar ? 'أكثر الفنانين استماعًا' : 'Top artists by qualified plays'}
          </h2>
          <p className="mb-4 text-xs text-muted">
            {ar
              ? 'مجموع الاستماعات التراكمية لأغاني كل فنان المنشورة.'
              : 'Sum of all-time counters for each artist’s published tracks.'}
          </p>
          {topArtists.length === 0 ? (
            <p className="text-sm text-muted">
              {ar ? 'لا توجد بيانات.' : 'No data yet.'}
            </p>
          ) : (
            topArtists.map((artist, i) => (
              <div
                key={artist.name + i}
                className="flex items-center justify-between gap-3 border-b border-white/5 py-3 text-sm"
              >
                <div className="min-w-0">
                  <span className="me-2 text-xs text-muted">{i + 1}.</span>
                  <span className="font-semibold text-ink">{artist.name}</span>
                  <p className="mt-1 text-xs text-muted">
                    {formatNumber(artist.tracks, locale)} {ar ? 'أغنية' : 'tracks'}
                  </p>
                </div>
                <span className="shrink-0 font-bold tabular-nums text-ink">
                  {formatNumber(artist.plays, locale)}
                </span>
              </div>
            ))
          )}
        </section>
      </div>
      <aside className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.045] p-5 text-sm text-muted">
        <h2 className="mb-2 font-bold text-ink">
          {ar ? 'حدود البيانات' : 'Data coverage and limitations'}
        </h2>
        <p>
          {ar
            ? 'مؤشرات المستمعين تحسب الحسابات المسجلة فقط من جلسات التشغيل المتاحة؛ لا تشمل الزوار المجهولين. إحصاءات الاحتفاظ، تخطي الأغاني، معدل الإكمال، والاتجاهات اليومية غير متاحة هنا حتى يتم ربط بيانات الأحداث والتحقق من اكتمالها.'
            : 'Listener counts cover signed-in accounts in available playback sessions, not anonymous visitors. Retention, skips, completion rates and daily trends are not shown until event-level analytics and completeness checks are connected.'}
        </p>
      </aside>
    </div>
  );
}
