import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Bell } from 'lucide-react';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { getSessionUser } from '@/lib/auth/session';
import { podcastInbox } from '@/lib/podcasts/notification-inbox';
import { PodcastNotificationCenter } from '@/components/podcasts/PodcastNotificationCenter';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'en';
  return buildMetadata({
    locale,
    path: '/podcasts/notifications',
    noindex: true,
    title: locale === 'ar' ? 'إشعارات البودكاست' : 'Podcast notifications',
    description: locale === 'ar'
      ? 'أحدث الحلقات من البرامج اللي بتتابعها، وتحكم في إشعارات البودكاست.'
      : 'New episodes from followed shows, read states and notification settings.',
  });
}

export default async function PodcastNotifications({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const ar = locale === 'ar';
  const user = await getSessionUser();
  const inbox = user ? await podcastInbox(user.id) : null;

  return (
    <main className="space-y-7 bg-[#0a0b0d] pb-10 text-white">
      <Link
        href={`/${locale}/podcasts`}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/70 hover:text-white"
      >
        {ar ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        {ar ? 'ارجع للبودكاست' : 'Back to podcasts'}
      </Link>
      <header className="space-y-3">
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#d4b0f4]">
          <Bell className="h-4 w-4" aria-hidden="true" />
          {ar ? 'مركز الإشعارات' : 'NOTIFICATION CENTER'}
        </span>
        <h1 className="text-3xl font-black sm:text-4xl">
          {ar ? 'جديد البرامج اللي بتتابعها' : 'New from your favorite shows'}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/70">
          {ar
            ? 'الحلقات الجديدة اللي نزلت بعد ما تابعت البرنامج بتظهر هنا. وتقدر تعلّم إشعاراتك كمقروءة أو توقفها.'
            : 'See new episodes released after you followed a show. Manage read status and turn alerts on or off.'}
        </p>
      </header>
      {!user ? (
        <section className="rounded-2xl border border-white/15 bg-white/[0.055] p-6">
          <h2 className="text-xl font-bold">
            {ar ? 'سجّل دخول عشان تشوف إشعاراتك' : 'Sign in to see your notifications'}
          </h2>
          <p className="mt-2 text-sm text-white/70">
            {ar ? 'إشعاراتك مرتبطة بحسابك ومش بتظهر لحد تاني.' : 'Your private alerts are linked to your account.'}
          </p>
          <Link
            href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/podcasts/notifications`)}`}
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-bold text-[#211527]"
          >
            {ar ? 'تسجيل الدخول' : 'Log in'}
          </Link>
        </section>
      ) : inbox ? (
        <>
          {inbox.demo ? (
            <p className="rounded-xl border border-white/15 bg-white/10 p-3 text-sm text-white/70">
              {ar ? 'الإشعارات مش متاحة في وضع العرض التجريبي.' : 'Notifications are unavailable in demo mode.'}
            </p>
          ) : null}
          <PodcastNotificationCenter locale={locale} initial={inbox} />
        </>
      ) : null}
    </main>
  );
}
