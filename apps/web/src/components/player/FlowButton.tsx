'use client';

import { Radio } from 'lucide-react';
import type { CatalogTrack } from '@/lib/data/queries';
import { usePlayer } from '@/lib/player-store';

export function FlowButton({
  tracks,
  locale,
}: {
  tracks: CatalogTrack[];
  locale: 'ar' | 'en';
}) {
  const startFlow = usePlayer((state) => state.startFlow);
  if (tracks.length === 0) return null;
  const ar = locale === 'ar';
  return (
    <button
      type="button"
      onClick={() => startFlow(tracks)}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-primary/50 bg-primary/15 px-5 py-2 text-sm font-semibold text-ink transition hover:bg-primary/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-label={ar ? 'ابدأ Oddio Flow' : 'Start Oddio Flow'}
      title={ar ? 'شغّل مجموعة موسيقى على ذوقك' : 'Play a discovery mix'}
    >
      <Radio size={18} aria-hidden="true" />
      {ar ? 'شغّل Oddio Flow' : 'Start Oddio Flow'}
    </button>
  );
}
