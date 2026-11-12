'use client';

import { useT } from '@/i18n/use-translator';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { apiRequest } from '@/lib/client-api';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';

export function StudioTrackActions({
  trackId,
  canSubmit,
}: {
  trackId: string;
  canSubmit: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  if (!canSubmit) return null;

  async function onClick() {
    setPending(true);
    try {
      await apiRequest(`/api/studio/tracks/${trackId}/submit`, { method: 'POST' });
      toast(t('studio.submittedReview'), 'success');
      router.refresh();
    } catch {
      toast('Could not submit the track.', 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={onClick} loading={pending}>
      <Send className="h-3.5 w-3.5" />
      {t('studio.submitReview')}
    </Button>
  );
}

export function VerificationButton({ artistId }: { artistId: string }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      await apiRequest('/api/studio/verification', {
        method: 'POST',
        body: JSON.stringify({ artistId }),
      });
      toast(t('studio.verificationPending'), 'success');
      router.refresh();
    } catch {
      toast('Could not request verification.', 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={onClick} loading={pending}>
      {t('studio.requestVerification')}
    </Button>
  );
}
