import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getAdminData } from '@/lib/data/queries';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminCommentToggle } from '@/components/admin/AdminActions';
import { formatDate } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : 'en';
  const t = createTranslator(safeLocale);
  return buildMetadata({
    locale: safeLocale,
    title: t('admin.comments'),
    description: t('admin.subtitle'),
    path: '/admin/comments',
    noindex: true,
  });
}

export default async function AdminCommentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const t = createTranslator(locale);
  const filters = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.roles.length === 0) redirect(`/${locale}`);
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const data = getAdminData(db, user.roles[0]!);
  const trackTitle = new Map(db.tracks.map((track) => [track.id, track.title]));
  const q = (filters.q ?? '').trim().toLocaleLowerCase();
  const status = filters.status ?? 'all';
  const comments = data.comments.filter((comment) => (status === 'all' || comment.status === status) && (!q || [comment.body, comment.userName, trackTitle.get(comment.trackId) ?? ''].some((value) => value.toLocaleLowerCase().includes(q))));

  return (
    <div className="space-y-5">
      <form method="get" className="card flex flex-wrap items-end gap-3 p-5">
        <label className="min-w-48 flex-1 text-xs text-muted">{locale === "ar" ? "بحث في التعليقات" : "Search comments"}<input name="q" defaultValue={filters.q ?? ""} className="input mt-1 w-full" /></label>
        <label className="text-xs text-muted">{locale === "ar" ? "الحالة" : "Status"}<select name="status" defaultValue={status} className="input mt-1 min-w-40"><option value="all">All</option><option value="visible">Visible</option><option value="hidden">Hidden</option></select></label>
        <button type="submit" className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">{locale === "ar" ? "تطبيق" : "Apply"}</button>
        <span className="text-xs text-muted">{comments.length} / {data.comments.length}</span>
      </form>
      {comments.length === 0 ? (
        <EmptyState title={t('admin.commentsEmpty')} />
      ) : (
        comments.map((comment) => (
          <article key={comment.id} className="card flex flex-wrap items-start gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink">{comment.userName}</span>
                <Badge tone={comment.status === 'visible' ? 'success' : 'warning'}>
                  {comment.status}
                </Badge>
                <span className="text-[11px] text-muted">
                  {formatDate(comment.createdAt, locale)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-line break-words text-sm text-ink/85">
                {comment.body}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {trackTitle.get(comment.trackId) ?? comment.trackId}
              </p>
            </div>
            <AdminCommentToggle commentId={comment.id} status={comment.status} />
          </article>
        ))
      )}
    </div>
  );
}
