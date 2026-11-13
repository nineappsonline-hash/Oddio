import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { serviceClient } from '@/lib/data/supabase-store';
import { TrackChangeModeration } from '@/components/admin/TrackChangeModeration';
export const dynamic = 'force-dynamic';
export default async function TrackChangesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getSessionUser();
  if (!user) redirect('/' + locale + '/login');
  if (!user.roles.some((role) => ['admin', 'super_admin', 'moderator'].includes(role)))
    redirect('/' + locale);
  const db = serviceClient();
  const { data: requests, error } = await db
    .from('track_change_requests')
    .select('id,track_id,change_type,srt_content,artwork_key,created_at,artist_user_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  const trackIds = [...new Set((requests || []).map((row) => row.track_id))];
  const { data: tracks } = trackIds.length
    ? await db.from('tracks').select('id,title').in('id', trackIds)
    : { data: [] };
  const titles = new Map((tracks || []).map((row) => [row.id, row.title]));
  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${locale}/admin`} className="text-sm text-fuchsia-300">
          ← Admin
        </Link>
        <h1 className="mt-3 text-3xl font-black">Track change approvals</h1>
        <p className="text-sm text-muted">
          Review synced lyrics and replacement cover art before anything goes live.
        </p>
      </div>
      {!(requests || []).length ? (
        <p className="card p-6 text-muted">No pending requests.</p>
      ) : null}
      {(requests || []).map((row) => (
        <article key={row.id} className="card space-y-3 p-5">
          <div className="flex flex-wrap justify-between gap-2">
            <h2 className="font-bold">{titles.get(row.track_id) || row.track_id}</h2>
            <span className="rounded-lg bg-white/10 px-2 py-1 text-xs uppercase text-fuchsia-200">
              {row.change_type}
            </span>
          </div>
          <p className="text-xs text-muted">
            Requested {new Date(row.created_at).toLocaleString()} · Artist{' '}
            {row.artist_user_id}
          </p>
          {row.change_type === 'srt' || row.change_type === 'lyrics_text' ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-4 text-xs text-white/85">
              {row.change_type === 'srt' && !row.srt_content
                ? 'Request to REMOVE approved synchronized lyrics'
                : row.srt_content}
            </pre>
          ) : row.artwork_key ? (
            <img
              src={
                db.storage.from('artwork').getPublicUrl(row.artwork_key).data.publicUrl
              }
              alt="Proposed cover artwork"
              className="h-48 w-48 rounded-xl object-cover"
            />
          ) : null}
          <TrackChangeModeration id={row.id} />
        </article>
      ))}
    </div>
  );
}
