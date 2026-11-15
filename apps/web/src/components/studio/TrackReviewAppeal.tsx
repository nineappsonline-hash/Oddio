'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/client-api';

export function TrackReviewAppeal({
  trackId,
  locale,
  existingStatus,
}: {
  trackId: string;
  locale: 'ar' | 'en';
  existingStatus?: string | null;
}) {
  const ar = locale === 'ar';
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState('');
  if (existingStatus === 'submitted' || existingStatus === 'under_review') {
    return (
      <p className="text-xs text-amber-300">
        {ar ? 'الاعتراض قيد المراجعة' : 'Appeal is under review'}
      </p>
    );
  }
  return (
    <details className="w-full rounded-xl border border-rose-400/20 p-3">
      <summary className="cursor-pointer text-xs font-bold text-rose-200">
        {ar ? 'اعتراض على قرار المراجعة' : 'Appeal review decision'}
      </summary>
      <form
        className="mt-3 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setFeedback('');
          try {
            await apiRequest('/api/studio/appeals', {
              method: 'POST',
              body: JSON.stringify({ trackId, reason }),
            });
            setFeedback(
              ar
                ? 'تم إرسال الاعتراض للمراجعة البشرية.'
                : 'Your appeal was submitted for human review.',
            );
            setReason('');
            router.refresh();
          } catch (error) {
            setFeedback(
              error instanceof Error ? error.message : 'Unable to submit appeal',
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="block text-xs text-muted" htmlFor={`appeal-${trackId}`}>
          {ar
            ? 'وضّح سبب الاعتراض وأي حقوق أو تفاصيل تساعد المراجع (30–2000 حرف)'
            : 'Explain your appeal and any relevant rights information (30–2000 characters)'}
        </label>
        <textarea
          id={`appeal-${trackId}`}
          value={reason}
          minLength={30}
          maxLength={2000}
          required
          onChange={(event) => setReason(event.target.value)}
          className="input min-h-28 w-full"
        />
        <button
          type="submit"
          disabled={pending || reason.trim().length < 30}
          className="min-h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40"
        >
          {pending
            ? ar
              ? 'جارٍ الإرسال…'
              : 'Submitting…'
            : ar
              ? 'إرسال الاعتراض'
              : 'Submit appeal'}
        </button>
        {feedback ? (
          <p role="status" className="text-xs text-muted">
            {feedback}
          </p>
        ) : null}
      </form>
    </details>
  );
}
