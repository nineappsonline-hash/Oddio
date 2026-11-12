'use client';

import { Share2 } from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';

export function ShareButton({
  title,
  label = 'Share',
}: {
  title: string;
  label?: string;
}) {
  const { toast } = useToast();

  async function onClick() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied to clipboard', 'success');
    } catch {
      toast(url, 'info');
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <Share2 className="h-4 w-4" />
      {label}
    </Button>
  );
}
