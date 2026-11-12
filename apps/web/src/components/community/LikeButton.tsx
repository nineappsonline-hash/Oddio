'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/client-api';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { loginHref, useLocalePath } from '@/lib/use-locale-path';
import { cn, formatNumber } from '@/lib/utils';

export function LikeButton({
  trackId,
  initialLiked,
  initialCount,
  compact = false,
  className,
}: {
  trackId: string;
  initialLiked: boolean;
  initialCount: number;
  compact?: boolean;
  className?: string;
}) {
  const { user } = useSession();
  const { locale, pathname } = useLocalePath();
  const router = useRouter();
  const { toast } = useToast();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!user) {
      router.push(loginHref(locale, pathname));
      return;
    }
    if (pending) return;
    setPending(true);
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((value) => Math.max(0, value + (nextLiked ? 1 : -1)));
    try {
      const result = await apiRequest<{ liked: boolean }>(`/api/tracks/${trackId}/like`, {
        method: 'POST',
      });
      setLiked(result.liked);
    } catch {
      setLiked(!nextLiked);
      setCount((value) => Math.max(0, value + (nextLiked ? -1 : 1)));
      toast('Could not update your like. Try again.', 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium transition',
        liked ? 'text-coral' : 'text-muted hover:text-ink',
        compact ? '' : 'border border-white/10 hover:border-white/20',
        className,
      )}
    >
      <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
      {compact ? (
        <span className="tabular-nums">{formatNumber(count, locale)}</span>
      ) : (
        <span>{formatNumber(count, locale)}</span>
      )}
    </button>
  );
}
