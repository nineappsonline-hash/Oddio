'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import type { Comment } from '@ai-music/contracts';
import { apiRequest } from '@/lib/client-api';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { loginHref, useLocalePath } from '@/lib/use-locale-path';
import { Avatar } from '@/components/ui/Artwork';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import type { Locale } from '@ai-music/contracts';

export function CommentSection({
  trackId,
  initialComments,
  locale,
}: {
  trackId: string;
  initialComments: Comment[];
  locale: Locale;
}) {
  const { user } = useSession();
  const { pathname } = useLocalePath();
  const { toast } = useToast();
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() || pending) return;
    setPending(true);
    try {
      const result = await apiRequest<{ comment: Comment }>(
        `/api/tracks/${trackId}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({ body }),
        },
      );
      if (result.comment.status === 'visible') {
        setComments((current) => [result.comment, ...current]);
      }
      setBody('');
      toast(
        result.comment.status === 'visible'
          ? 'Comment posted'
          : 'Comment held for moderation',
        'success',
      );
    } catch {
      toast('Could not post your comment.', 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="comments-heading" className="space-y-4">
      <h2
        id="comments-heading"
        className="flex items-center gap-2 text-xl font-bold text-ink"
      >
        <MessageSquare className="h-5 w-5 text-primary" />
        Comments
        <span className="text-sm font-normal text-muted">({comments.length})</span>
      </h2>

      {user ? (
        <form onSubmit={submit} className="space-y-2">
          <textarea
            className="input min-h-20"
            placeholder="Write a comment…"
            value={body}
            maxLength={2000}
            onChange={(event) => setBody(event.target.value)}
            aria-label="Write a comment"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={pending} disabled={!body.trim()}>
              Post comment
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted">
          <Link
            href={loginHref(locale, pathname)}
            className="text-primary hover:underline"
          >
            Log in
          </Link>{' '}
          to join the conversation.
        </p>
      )}

      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-muted">No comments yet. Be the first.</p>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="surface flex gap-3 p-3">
              <Avatar name={comment.userName} className="h-9 w-9 shrink-0" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-ink">{comment.userName}</span>
                  <span className="text-muted">
                    {formatDate(comment.createdAt, locale)}
                  </span>
                  {comment.status !== 'visible' ? (
                    <span className="rounded-pill bg-warning/15 px-2 py-0.5 text-[10px] uppercase text-warning">
                      Pending
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-ink/90">
                  {comment.body}
                </p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
