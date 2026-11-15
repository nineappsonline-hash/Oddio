'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/client-api';

type Proposal = {
  source: string;
  genreSlug: string;
  moodSlugs: string[];
  confidence: number;
  evidenceCount: number;
};

export function ReviewMusicTags({
  trackId,
  locale,
  proposal,
}: {
  trackId: string;
  locale: 'en' | 'ar';
  proposal: Proposal;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const ar = locale === 'ar';
  const accept = async () => {
    const confirmed = window.confirm(
      ar
        ? 'تأكيد تطبيق النوع والمزاج المقترحين على الأغنية؟ القرار اختياري ولن يتم تلقائيًا.'
        : 'Apply the suggested genre and moods to this track? Nothing changes without your approval.',
    );
    if (!confirmed) return;
    setPending(true);
    setError('');
    try {
      await apiRequest(`/api/studio/tracks/${trackId}/music-tags`, {
        method: 'POST',
        body: JSON.stringify({ action: 'accept' }),
      });
      router.refresh();
    } catch {
      setError(ar ? 'تعذّر اعتماد الاقتراح. حاول مرة أخرى.' : 'Could not apply the suggestion.');
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="w-full rounded-xl border border-violet-400/25 bg-violet-400/5 p-3">
      <h3 className="text-sm font-semibold text-white">
        {ar ? 'اقتراحات التصنيف الصوتي للمراجعة' : 'Review suggested music tags'}
      </h3>
      <p className="mt-1 text-xs text-muted">
        {ar
          ? 'اقتراح من نموذج محلي اتقيّم على أمثلة راجعها فنانون. النتيجة ممكن تكون غير دقيقة.'
          : 'Optional suggestion from a locally validated artist-reviewed model. It may be inaccurate.'}
      </p>
      <p className="mt-2 text-sm text-ink">
        {ar ? 'النوع:' : 'Genre:'} <strong>{proposal.genreSlug}</strong>
        {' · '}
        {ar ? 'الحالات:' : 'Moods:'}{' '}
        <strong>{proposal.moodSlugs.length ? proposal.moodSlugs.join(', ') : '—'}</strong>
      </p>
      <p className="mt-1 text-xs text-muted">
        {ar ? 'درجة تقديرية' : 'Estimated confidence'}:{' '}
        {Math.round(proposal.confidence * 100)}% ·{' '}
        {proposal.evidenceCount} {ar ? 'أمثلة قريبة' : 'similar references'}
      </p>
      <button
        type="button"
        className="mt-3 min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
        disabled={pending}
        onClick={() => void accept()}
      >
        {pending ? (ar ? 'جاري الاعتماد…' : 'Applying…') : (ar ? 'اعتماد الاقتراح' : 'Approve tags')}
      </button>
      {error ? <p role="alert" className="mt-2 text-xs text-red-300">{error}</p> : null}
    </section>
  );
}
