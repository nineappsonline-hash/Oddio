'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { apiRequest } from '@/lib/client-api';

export function PodcastFollowButton({
  showId, locale, signedIn, initialFollowing, demo = false,
}: {
  showId: string;
  locale: 'ar' | 'en';
  signedIn: boolean;
  initialFollowing: boolean;
  demo?: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const ar = locale === 'ar';
  if (!signedIn) {
    return (
      <Link
        href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/podcasts/following`)}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#201625] hover:bg-white/85"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {ar ? 'سجّل دخول عشان تتابع' : 'Log in to follow'}
      </Link>
    );
  }
  return (
    <div className="inline-flex flex-col gap-1.5">
      <button type="button"
        aria-pressed={following}
        disabled={busy || demo}
        onClick={async () => {
          setBusy(true);
          setMessage('');
          try {
            const next = !following;
            await apiRequest('/api/podcasts/follows', {
              method: next ? 'POST' : 'DELETE',
              body: JSON.stringify({ showId }),
            });
            setFollowing(next);
            router.refresh();
          } catch {
            setMessage(ar ? 'حصلت مشكلة في حفظ المتابعة. جرّب تاني.' : 'Could not save. Please retry.');
          } finally {
            setBusy(false);
          }
        }}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white px-4 text-sm font-bold text-[#201625] transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {following ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {busy
          ? ar ? 'بيتحفظ...' : 'Saving...'
          : following
            ? ar ? 'بتتابع البرنامج ✓' : 'Following'
            : ar ? 'تابع البرنامج' : 'Follow show'}
      </button>
      <span role="status" aria-live="polite" className="text-xs text-white/65">
        {demo ? (ar ? 'المتابعة مش متاحة في النسخة التجريبية' : 'Following is unavailable in demo mode') : message}
      </span>
    </div>
  );
}
