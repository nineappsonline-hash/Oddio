'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCheck, Circle, Headphones, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/client-api';
import type { PodcastInbox } from '@/lib/podcasts/notification-inbox';

export function PodcastNotificationCenter({
  locale,
  initial,
}: {
  locale: 'ar' | 'en';
  initial: PodcastInbox;
}) {
  const ar = locale === 'ar';
  const [inbox, setInbox] = useState(initial);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function refresh() {
    try {
      const next = await apiRequest<PodcastInbox>('/api/podcasts/notifications');
      setInbox(next);
    } catch {
      setNotice(ar ? 'تعذّر تحديث الإشعارات دلوقتي.' : 'Could not refresh notifications.');
    }
  }

  useEffect(() => {
    const onFocus = () => { void refresh(); };
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 60_000);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
    // Only rebind when the viewer's locale changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function action(payload:
    | { action: 'read'; episodeId: string; read: boolean }
    | { action: 'read_all' }
    | { action: 'preferences'; enabled: boolean }) {
    setBusy(true);
    setNotice('');
    try {
      const next = await apiRequest<PodcastInbox>('/api/podcasts/notifications', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setInbox(next);
      setNotice(ar ? 'اتحفظ التغيير.' : 'Saved.');
    } catch {
      setNotice(ar ? 'حصلت مشكلة. جرّب تاني.' : 'Could not save your change. Retry.');
    } finally {
      setBusy(false);
    }
  }

  const visible = inbox.entries.filter((entry) => filter === 'all' || !entry.read);
  return (
    <section className="space-y-5" aria-label={ar ? 'إشعارات البودكاست' : 'Podcast notifications'}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.055] p-4">
        <div className="flex items-center gap-3">
          {inbox.enabled
            ? <Bell className="h-6 w-6 text-[#d4b0f4]" aria-hidden="true" />
            : <BellOff className="h-6 w-6 text-white/60" aria-hidden="true" />}
          <div>
            <p className="font-bold text-white">
              {ar ? 'تنبيهات الحلقات الجديدة' : 'New episode alerts'}
            </p>
            <p className="text-xs leading-6 text-white/65">
              {ar
                ? 'تنبيهات جوه Oddio بس، من البرامج اللي بتتابعها.'
                : 'In-app alerts from your followed shows. No email or push notifications.'}
            </p>
          </div>
        </div>
        <button type="button"
          role="switch"
          aria-checked={inbox.enabled}
          aria-label={ar ? 'تفعيل إشعارات البودكاست' : 'Enable podcast notifications'}
          disabled={busy || inbox.demo}
          onClick={() => void action({ action: 'preferences', enabled: !inbox.enabled })}
          className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition disabled:opacity-50 ${inbox.enabled
            ? 'border-[#d4b0f4] bg-[#d4b0f4] text-[#211527]'
            : 'border-white/25 bg-white/10 text-white'}`}>
          {inbox.enabled ? ar ? 'مفعّلة' : 'On' : ar ? 'متوقفة' : 'Off'}
        </button>
      </div>

      {inbox.enabled ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="group"
              aria-label={ar ? 'فلترة الإشعارات' : 'Notification filters'}>
              <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}
                className={`min-h-11 rounded-xl border px-4 text-sm font-bold ${filter === 'all'
                  ? 'bg-white text-[#211527]' : 'border-white/20 bg-white/10 text-white'}`}>
                {ar ? 'الكل' : 'All'} ({inbox.entries.length})
              </button>
              <button type="button" aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}
                className={`min-h-11 rounded-xl border px-4 text-sm font-bold ${filter === 'unread'
                  ? 'bg-white text-[#211527]' : 'border-white/20 bg-white/10 text-white'}`}>
                {ar ? 'غير مقروءة' : 'Unread'} ({inbox.unreadCount})
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void refresh()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 text-sm text-white hover:bg-white/10">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {ar ? 'تحديث' : 'Refresh'}
              </button>
              <button type="button" disabled={busy || !inbox.unreadCount}
                onClick={() => void action({ action: 'read_all' })}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-40">
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                {ar ? 'علّم الكل كمقروء' : 'Mark all read'}
              </button>
            </div>
          </div>
          {visible.length ? (
            <div className="space-y-3">
              {visible.map((entry) => (
                <article key={entry.episodeId}
                  className={`flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border p-4 sm:flex-nowrap ${entry.read
                    ? 'border-white/10 bg-white/[0.035]'
                    : 'border-[#d4b0f4]/35 bg-[#d4b0f4]/[0.075]'}`}>
                  {entry.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.coverUrl} alt="" loading="lazy"
                      className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  ) : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-white/10">
                    <Headphones className="h-6 w-6 text-white/60" aria-hidden="true" />
                  </span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-white/65">{entry.showTitle}</p>
                    <Link href={`/${locale}/podcasts/shows/${entry.showSlug}`}
                      className="mt-1 line-clamp-2 text-sm font-bold text-white hover:underline">
                      {entry.episodeTitle}
                    </Link>
                    <p className="mt-2 text-xs text-white/55">
                      {ar ? 'حلقة جديدة' : 'New episode'} ·{' '}
                      {new Date(entry.publishedAt).toLocaleDateString(ar ? 'ar-EG' : 'en-US')}
                    </p>
                  </div>
                  <button type="button" disabled={busy}
                    onClick={() => void action({
                      action: 'read',
                      episodeId: entry.episodeId,
                      read: !entry.read,
                    })}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 text-sm text-white hover:bg-white/10 disabled:opacity-50">
                    {entry.read ? <Circle className="h-4 w-4" /> : <CheckCheck className="h-4 w-4" />}
                    {entry.read
                      ? ar ? 'علّم كغير مقروء' : 'Mark unread'
                      : ar ? 'علّم كمقروء' : 'Mark read'}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/15 bg-white/[0.05] px-5 py-12 text-center">
              <Bell className="mx-auto h-8 w-8 text-white/55" aria-hidden="true" />
              <h2 className="mt-3 text-lg font-bold">
                {filter === 'unread'
                  ? ar ? 'مفيش إشعارات غير مقروءة' : 'All caught up'
                  : ar ? 'مفيش إشعارات جديدة دلوقتي' : 'No new episode alerts yet'}
              </h2>
              <p className="mt-2 text-sm text-white/65">
                {ar
                  ? 'تابع برامجك المفضلة، وأول ما ينزل منها حلقات جديدة هتظهر هنا.'
                  : 'Follow your favorite shows; future published episodes will appear here.'}
              </p>
              <Link href={`/${locale}/podcasts/following`}
                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-bold text-[#211527]">
                {ar ? 'برامجي المتابَعة' : 'Your followed shows'}
              </Link>
            </div>
          )}
        </>
      ) : (
        <p className="rounded-xl border border-white/15 bg-white/5 p-5 text-sm text-white/70">
          {ar
            ? 'إشعارات البودكاست متوقفة. تقدر تشغلها في أي وقت.'
            : 'Podcast alerts are paused. You can turn them back on whenever you like.'}
        </p>
      )}
      <p role="status" aria-live="polite" className="min-h-4 text-xs text-white/65">{notice}</p>
    </section>
  );
}
