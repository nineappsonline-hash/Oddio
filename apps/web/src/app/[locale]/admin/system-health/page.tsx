import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { isLocale } from '@/i18n/config';

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
    uploads24h = db.uploadEvents.filter((event) => new Date(event.createdAt).getTime() >= cutoff).length;
    playback24h = db.playbackEvents.filter((event) => new Date(event.createdAt).getTime() >= cutoff).length;
    queuedTracks = db.tracks.filter((track) => track.publishStatus !== 'published').length;
  } catch {
    // Keep the diagnostic page accessible even when its database is unavailable.
  }
  const metrics = [
    { en: 'Database read', ar: 'قراءة قاعدة البيانات', value: database === 'reachable' ? (ar ? 'متاح' : 'Reachable') : (ar ? 'غير متاح' : 'Unavailable') },
    { en: 'Uploads (24h)', ar: 'عمليات الرفع (24 ساعة)', value: uploads24h },
    { en: 'Playback events (24h)', ar: 'أحداث التشغيل (24 ساعة)', value: playback24h },
    { en: 'Not yet published tracks', ar: 'أغانٍ لم تُنشر بعد', value: queuedTracks },
  ];
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">SYSTEM &amp; SECURITY</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">{ar ? 'حالة النظام' : 'System health'}</h2>
        <p className="mt-2 text-sm text-muted">
          {ar ? 'مؤشرات تشخيصية عند تحميل الصفحة، وليست مراقبة لحظية للخدمات.' : 'Point-in-time diagnostics, not live infrastructure monitoring.'}
        </p>
        <p className="mt-1 text-xs text-muted">{ar ? 'وقت الفحص:' : 'Checked:'} {checkedAt.toISOString()}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.en} className="card p-5">
            <p className="text-sm text-muted">{ar ? metric.ar : metric.en}</p>
            <p className="mt-3 text-2xl font-bold text-ink">{metric.value ?? '—'}</p>
          </div>
        ))}
      </div>
      <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted">
        {ar ? 'نجاح قراءة قاعدة البيانات لا يؤكد حالة معالجة الصوت أو التخزين أو توفر الخدمات الخارجية. يلزم إضافة فحوص مستقلة لهذه الخدمات.' : 'A successful database read does not verify audio processing, storage, or external service availability. Those require separate health checks.'}
      </p>
    </div>
  );
}
