'use client';

import { useEffect, useState } from 'react';
import { HeartCrack } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/client-api';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { loginHref, useLocalePath } from '@/lib/use-locale-path';

export function DislikeButton({ trackId }: { trackId: string }) {
  const { user } = useSession();
  const { locale, pathname } = useLocalePath();
  const router = useRouter();
  const { toast } = useToast();
  const [disliked, setDisliked] = useState(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!user) { setDisliked(false); return; }
    const controller = new AbortController();
    fetch(`/api/tracks/${encodeURIComponent(trackId)}/dislike`, { signal: controller.signal })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (!controller.signal.aborted) setDisliked(Boolean(data?.data?.disliked)); })
      .catch(() => {});
    return () => controller.abort();
  }, [trackId, user]);
  async function toggle() {
    if (!user) { router.push(loginHref(locale, pathname)); return; }
    if (pending) return;
    setPending(true);
    try {
      const result = await apiRequest<{ disliked: boolean }>(`/api/tracks/${trackId}/dislike`, { method: 'POST' });
      setDisliked(result.disliked);
    } catch {
      toast(locale === 'ar' ? 'تعذر تسجيل عدم الإعجاب' : 'Could not save dislike', 'error');
    } finally { setPending(false); }
  }
  return <button type="button" onClick={toggle} disabled={pending} aria-pressed={disliked} aria-label={locale === 'ar' ? 'عدم إعجاب' : 'Dislike'} title={locale === 'ar' ? 'عدم إعجاب' : 'Dislike'} className={`inline-flex items-center justify-center rounded-full border border-white/10 p-2 transition hover:border-white/25 ${disliked ? 'text-rose-400 bg-rose-500/10' : 'text-muted hover:text-white'}`}><HeartCrack className={`h-5 w-5 ${disliked ? 'fill-current' : ''}`} /></button>;
}
