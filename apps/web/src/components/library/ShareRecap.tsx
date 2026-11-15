'use client';

import { useState } from 'react';

export function ShareRecap({
  locale,
  monthLabel,
  listens,
  tracks,
  artists,
}: {
  locale: 'ar' | 'en';
  monthLabel: string;
  listens: number;
  tracks: number;
  artists: number;
}) {
  const [message, setMessage] = useState('');
  const ar = locale === 'ar';
  async function share() {
    const summary = ar
      ? `ملخصي على Oddio في ${monthLabel}: ${listens} استماع مؤهل، ${tracks} أغنية، ${artists} فنان. 🎵`
      : `My Oddio recap for ${monthLabel}: ${listens} qualified listens, ${tracks} tracks, ${artists} artists. 🎵`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Oddio Recap', text: summary });
        setMessage(ar ? 'اتفتح خيار المشاركة.' : 'Share sheet opened.');
      } else {
        await navigator.clipboard.writeText(summary);
        setMessage(ar ? 'اتنسخ الملخص.' : 'Recap copied to clipboard.');
      }
    } catch {
      setMessage(ar ? 'المشاركة اتلغت أو مش متاحة.' : 'Sharing cancelled or unavailable.');
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => void share()}
        className="min-h-11 rounded-full bg-primary px-5 text-sm font-bold text-white">
        {ar ? 'شارك ملخصك' : 'Share your recap'}
      </button>
      {message ? <span role="status" className="text-xs text-muted">{message}</span> : null}
    </div>
  );
}
