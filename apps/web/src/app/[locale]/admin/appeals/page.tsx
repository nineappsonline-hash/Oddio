import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { serviceClient } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { ReviewAppealDecision } from '@/components/admin/ReviewAppealDecision';

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
    title: safeLocale === 'ar' ? 'اعتراضات الفنانين' : 'Artist appeals',
    description: 'Moderation appeal queue',
    path: '/admin/appeals',
    noindex: true,
  });
}

export default async function AdminAppealsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const ar = locale === 'ar';
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  if (!user.roles.some((role) => ['admin', 'super_admin', 'moderator'].includes(role))) {
    redirect(`/${locale}`);
  }
  if (demoMode) return <p className="text-muted">Appeals require persistent accounts.</p>;

  const { data: appeals, error } = await serviceClient()
    .from('track_review_appeals')
    .select('id,track_id,reason,status,created_at,response')
    .in('status', ['submitted', 'under_review'])
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);
  const trackIds = (appeals ?? []).map((item) => item.track_id);
  const { data: tracks, error: trackError } = trackIds.length
    ? await serviceClient().from('tracks').select('id,title').in('id', trackIds)
    : { data: [] as Array<{ id: string; title: string }>, error: null };
  if (trackError) throw new Error(trackError.message);
  const names = new Map((tracks ?? []).map((item) => [item.id, item.title]));
  return (
    <main className="space-y-6 pb-20">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          ODDIO MODERATION
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          {ar ? 'اعتراضات الفنانين' : 'Artist review appeals'}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {ar
            ? 'اعتراضات قيد المراجعة مرتبة بالأقدم.'
            : 'Open artist appeals, oldest first.'}
        </p>
      </header>
      {(appeals ?? []).length ? (
        (appeals ?? []).map((appeal) => (
          <article
            key={appeal.id}
            className="rounded-2xl border border-white/10 bg-white/[.035] p-5"
          >
            <h2 className="font-bold">{names.get(appeal.track_id) ?? appeal.track_id}</h2>
            <p className="mt-1 text-xs text-amber-200">
              {appeal.status} · {new Date(appeal.created_at).toLocaleDateString(locale)}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm">{appeal.reason}</p>
            <ReviewAppealDecision id={appeal.id} locale={locale} />
          </article>
        ))
      ) : (
        <div className="rounded-2xl border border-white/10 p-6 text-sm text-muted">
          {ar ? 'مفيش اعتراضات مفتوحة دلوقتي.' : 'No open appeals.'}
        </div>
      )}
    </main>
  );
}
