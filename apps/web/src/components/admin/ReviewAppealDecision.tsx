'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/client-api';

export function ReviewAppealDecision({
  id, locale,
}: {
  id: string;
  locale: 'ar' | 'en';
}) {
  const ar = locale === 'ar';
  const router = useRouter();
  const [response, setResponse] = useState('');
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState('');
  async function decide(status: 'under_review' | 'upheld' | 'overturned') {
    setWorking(true);
    setFeedback('');
    try {
      await apiRequest(`/api/admin/appeals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, response: response.trim() || undefined }),
      });
      router.refresh();
      setFeedback(ar ? 'تم تحديث الاعتراض.' : 'Appeal updated.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to update appeal');
    } finally {
      setWorking(false);
    }
  }
  return (
    <div className="mt-3 space-y-3">
      <label className="block text-xs text-muted" htmlFor={`appeal-response-${id}`}>
        {ar ? 'رد المراجع (مطلوب عند إنهاء الاعتراض)' : 'Reviewer response (required for a final decision)'}
      </label>
      <textarea id={`appeal-response-${id}`} value={response} maxLength={2000}
        onChange={(event) => setResponse(event.target.value)}
        className="input min-h-24 w-full" />
      <div className="flex flex-wrap gap-2">
        {([
          ['under_review', ar ? 'بدء المراجعة' : 'Review'],
          ['upheld', ar ? 'تأييد الرفض' : 'Uphold rejection'],
          ['overturned', ar ? 'قبول الاعتراض' : 'Accept appeal'],
        ] as const).map(([status, label]) => (
          <button key={status} type="button" disabled={working || (status !== 'under_review' && response.trim().length < 15)}
            onClick={() => void decide(status)}
            className="min-h-10 rounded-lg border border-white/20 px-3 text-xs text-white disabled:opacity-40">
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-amber-200">
        {ar ? 'قبول الاعتراض لا ينشر الأغنية تلقائيًا.' : 'Accepting an appeal does not automatically publish the track.'}
      </p>
      {feedback ? <p role="status" className="text-xs text-muted">{feedback}</p> : null}
    </div>
  );
}
