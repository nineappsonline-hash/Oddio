'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus } from 'lucide-react';
import { apiRequest } from '@/lib/client-api';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { loginHref, useLocalePath } from '@/lib/use-locale-path';
import { Button } from '@/components/ui/Button';

export function FollowButton({
  artistId,
  initialFollowing,
  labels,
  className,
}: {
  artistId: string;
  initialFollowing: boolean;
  labels: { follow: string; following: string };
  className?: string;
}) {
  const { user } = useSession();
  const { locale, pathname } = useLocalePath();
  const router = useRouter();
  const { toast } = useToast();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!user) {
      router.push(loginHref(locale, pathname));
      return;
    }
    setPending(true);
    const next = !following;
    setFollowing(next);
    try {
      const result = await apiRequest<{ following: boolean }>(
        `/api/artists/${artistId}/follow`,
        { method: 'POST' },
      );
      setFollowing(result.following);
    } catch {
      setFollowing(!next);
      toast('Could not update follow. Try again.', 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      loading={pending}
      variant={following ? 'outline' : 'primary'}
      size="sm"
      className={className}
      aria-pressed={following}
    >
      {following ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      {following ? labels.following : labels.follow}
    </Button>
  );
}
