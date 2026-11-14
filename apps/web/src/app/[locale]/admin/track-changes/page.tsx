import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { serviceClient } from '@/lib/data/supabase-store';
import { TrackChangeModeration } from '@/components/admin/TrackChangeModeration';

export const dynamic = 'force-dynamic';

export default async function TrackChangesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { locale } = await params;
  const ar = locale === 'ar';
  const filters = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect('/' + locale + '/login');
  if (!user.roles.some((role) => ['admin', 'super_admin', 'moderator'].includes(role))) redirect('/' + locale);

  const db = serviceClient();
  const { data: requests, error } = await db
    .from('track_change_requests')
    .select('id,track_id,change_type,srt_content,artwork_key,created_at,artist_user_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  const trackIds = [...new Set((requests || []).map((row) => row.track_id))];
  const { data: tracks, error: tracksError } = trackIds.length
    ? await db.from('tracks').select('id,title').in('id', trackIds)
    : { data: [], error: null };
  if (tracksError) throw tracksError;
  const titles = new Map((tracks || []).map((row) => [row.id, row.title]));
  const q = (filters.q ?? '').trim().toLocaleLowerCase();
  const type = filters.type ?? 'all';
  const filtered = (requests || []).filter((row) =>
    (type === 'all' || row.change_type === type) &&
    (!q || [titles.get(row.track_id) ?? '', row.track_id, row.artist_user_id].some((value) => value.toLocaleLowerCase().includes(q)))
  );
  const labels: Record<string, string> = {
    srt: ar ? 'كلمات متزامنة' : 'Synced lyrics',
    lyrics_text: ar ? 'كلمات الأغنية' : 'Lyrics',
    artwork: ar ? 'غلاف الأغنية' : 'Cover artwork',
  };
  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <Link href={`/${locale}/admin`} className="text-xs font-bold text-primary hover:underline">
          {ar ? '← مركز التحكم' : '← Command Center'}
        </Link>
        <h1 className="mt-3 text-2xl font-black text-ink">{ar ? 'مراجعة تعديلات الأغاني' : 'Track change review'}</h1>
        <p className="mt-1 text-sm text-muted">
          {ar ? 'راجع تعديلات الكلمات والأغلفة قبل نشرها. الأقدم يظهر أولًا.' : 'Review lyrics and replacement artwork before publishing. Oldest requests appear first.'}
        </p>
        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1 text-xs text-muted">
            {ar ? 'بحث باسم الأغنية أو المعرّف' : 'Search track or ID'}
            <input name="q" defaultValue={filters.q ?? ''} className="input mt-1 w-full" />
          </label>
          <label className="text-xs text-muted">
            {ar ? 'نوع التعديل' : 'Change type'}
            <select name="type" defaultValue={type} className="input mt-1 min-w-40">
              <option value="all">{ar ? 'كل الأنواع' : 'All types'}</option>
              <option value="srt">{labels.srt}</option>
              <option value="lyrics_text">{labels.lyrics_text}</option>
              <option value="artwork">{labels.artwork}</option>
            </select>
          </label>
          <button type="submit" className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">{ar ? 'تطبيق' : 'Apply'}</button>
          <Link href={`/${locale}/admin/track-changes`} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-muted">{ar ? 'مسح' : 'Clear'}</Link>
        </form>
        <p className="mt-3 text-xs text-muted">{filtered.length} / {(requests || []).length} {ar ? 'طلب معروض (من أحدث 100 طلب معلق كحد أقصى)' : 'requests shown (up to 100 pending requests loaded)'}</p>
      </header>
      {!filtered.length && <p className="card p-6 text-sm text-muted">{ar ? 'لا توجد طلبات مطابقة.' : 'No matching requests.'}</p>}
      {filtered.map((row) => {
        const overdue = Date.now() - new Date(row.created_at).getTime() >= 48 * 3600000;
        return (
          <article key={row.id} className="card space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-ink">{titles.get(row.track_id) || row.track_id}</h2>
                <p className="mt-1 text-xs text-muted">{ar ? 'تاريخ الطلب' : 'Requested'}: {new Date(row.created_at).toLocaleString(ar ? 'ar-EG' : 'en-US')}</p>
                <p className="mt-1 break-all text-xs text-muted">{ar ? 'معرّف الفنان' : 'Artist ID'}: {row.artist_user_id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">{labels[row.change_type] ?? row.change_type}</span>
                {overdue && <span className="rounded-lg bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300">{ar ? 'منتظر أكثر من 48 ساعة' : 'Waiting over 48h'}</span>}
              </div>
            </div>
            {(row.change_type === 'srt' || row.change_type === 'lyrics_text') ? (
              <div>
                <h3 className="mb-2 text-xs font-bold text-muted">{ar ? 'الكلمات المقترحة' : 'Proposed lyrics'}</h3>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-ink/85">
                  {row.change_type === 'srt' && !row.srt_content
                    ? (ar ? 'طلب إزالة الكلمات المتزامنة المعتمدة' : 'Request to remove approved synchronized lyrics')
                    : row.srt_content || (ar ? 'لا يوجد نص مقدم' : 'No text supplied')}
                </pre>
              </div>
            ) : row.artwork_key ? (
              <div>
                <h3 className="mb-2 text-xs font-bold text-muted">{ar ? 'الغلاف المقترح' : 'Proposed cover'}</h3>
                <img src={db.storage.from('artwork').getPublicUrl(row.artwork_key).data.publicUrl} alt={ar ? 'الغلاف المقترح' : 'Proposed cover artwork'} className="h-48 w-48 rounded-xl border border-white/10 object-cover" />
              </div>
            ) : <p className="rounded-xl border border-amber-400/20 p-3 text-xs text-amber-300">{ar ? 'لم يتم العثور على ملف الغلاف المقترح.' : 'Proposed artwork file is missing.'}</p>}
            <TrackChangeModeration id={row.id} locale={locale} />
          </article>
        );
      })}
    </div>
  );
}
