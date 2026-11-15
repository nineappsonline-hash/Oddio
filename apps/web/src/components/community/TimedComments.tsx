'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import type { Comment } from '@ai-music/contracts';
import { apiRequest } from '@/lib/client-api';
import { usePlayer } from '@/lib/player-store';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useLocalePath, loginHref } from '@/lib/use-locale-path';
import Link from 'next/link';

export function TimedComments({ trackId }: { trackId: string }) {
  const { user } = useSession();
  const { locale, pathname } = useLocalePath();
  const { toast } = useToast();
  const currentTime = usePlayer((state) => state.currentTime);
  const duration = usePlayer((state) => state.duration);
  const seek = usePlayer((state) => state.seek);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [stamp, setStamp] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const ar = locale === 'ar';
  useEffect(() => {
    const controller = new AbortController();
    setComments([]);
    fetch('/api/tracks/' + encodeURIComponent(trackId) + '/comments', {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!controller.signal.aborted) setComments(data?.data?.comments ?? []);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [trackId]);
  const timed = useMemo(
    () => comments.filter((item) => item.timestampSeconds != null),
    [comments],
  );
  const active = timed.filter(
    (item) => Math.abs((item.timestampSeconds ?? -100) - currentTime) < 3,
  );
  const seconds = Math.max(0, Math.floor(currentTime));
  const format = (value: number) =>
    `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() || loading) return;
    setLoading(true);
    try {
      const result = await apiRequest<{ comment: Comment }>(
        `/api/tracks/${trackId}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({ body, timestampSeconds: stamp ?? seconds }),
        },
      );
      if (result.comment.status === 'visible')
        setComments((items) => [result.comment, ...items]);
      toast(
        result.comment.status === 'visible'
          ? ar
            ? 'تم نشر التعليق'
            : 'Comment posted'
          : ar
            ? 'التعليق قيد المراجعة'
            : 'Comment held for moderation',
        'success',
      );
      setBody('');
      setStamp(null);
    } catch {
      toast(ar ? 'تعذر نشر التعليق' : 'Could not post comment', 'error');
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <MessageCircle className="h-4 w-4 text-primary" />
          {ar ? 'تعليقات على الأغنية' : 'Timed comments'}{' '}
          <span className="text-muted">({comments.length})</span>
        </h2>
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-xs font-semibold text-primary"
        >
          {showAll ? (ar ? 'إخفاء' : 'Hide') : ar ? 'عرض الكل' : 'See all'}
        </button>
      </div>
      <div
        className="relative mb-4 h-5"
        aria-label={ar ? 'أماكن التعليقات' : 'Comment markers'}
      >
        <div className="absolute inset-x-0 top-2 h-1 rounded-full bg-white/15" />
        {timed.map((comment) => (
          <button
            key={comment.id}
            type="button"
            onClick={() => seek(comment.timestampSeconds ?? 0)}
            title={`${format(comment.timestampSeconds ?? 0)} — ${comment.userName}: ${comment.body}`}
            aria-label={`${format(comment.timestampSeconds ?? 0)} ${comment.body}`}
            className="absolute top-0 h-4 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(157,92,255,.8)]"
            style={{
              left: `${Math.min(99, Math.max(0, ((comment.timestampSeconds ?? 0) / Math.max(1, duration)) * 100))}%`,
            }}
          />
        ))}
      </div>
      {active.length > 0 ? (
        <div aria-live="polite" className="mb-3 space-y-1">
          {active.slice(0, 2).map((item) => (
            <p
              key={item.id}
              className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-white"
            >
              <strong className="text-primary">{item.userName}: </strong>
              {item.body}
            </p>
          ))}
        </div>
      ) : null}
      {showAll ? (
        <div className="mb-3 max-h-48 space-y-2 overflow-y-auto">
          {comments.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => {
                if (item.timestampSeconds != null) seek(item.timestampSeconds);
              }}
              className="block w-full rounded-lg bg-white/5 px-3 py-2 text-start text-xs text-white"
            >
              <span className="me-2 font-bold text-primary">
                {item.timestampSeconds == null ? '—' : format(item.timestampSeconds)}
              </span>
              <strong>{item.userName}</strong> {item.body}
            </button>
          ))}
        </div>
      ) : null}
      {user ? (
        <form onSubmit={submit} className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              className="input min-w-0 flex-1"
              maxLength={2000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={ar ? 'اكتب تعليق عند اللحظة دي…' : 'Comment at this moment…'}
              aria-label={ar ? 'اكتب تعليق' : 'Write a timed comment'}
            />
            <button
              type="submit"
              disabled={!body.trim() || loading}
              className="rounded-full bg-primary p-2.5 text-white disabled:opacity-40"
              aria-label={ar ? 'نشر' : 'Post'}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setStamp(stamp === null ? seconds : null)}
            className="text-xs text-muted"
          >
            {stamp === null
              ? ar
                ? `ثبّت الوقت الحالي ${format(seconds)}`
                : `Pin time ${format(seconds)}`
              : ar
                ? `الوقت المثبت ${format(stamp)} ✓`
                : `Pinned at ${format(stamp)} ✓`}
          </button>
        </form>
      ) : (
        <Link href={loginHref(locale, pathname)} className="text-xs text-primary">
          {ar ? 'سجّل دخولك للتعليق' : 'Log in to comment'}
        </Link>
      )}
    </section>
  );
}
