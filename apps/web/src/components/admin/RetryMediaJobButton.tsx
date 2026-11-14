'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function RetryMediaJobButton({ jobId, ar }: { jobId: string; ar: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function retry() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/system-health/retry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ jobId }),
      });
      if (!response.ok) throw new Error('Retry unavailable');
      setMessage(ar ? 'تمت إعادة المهمة لقائمة الانتظار' : 'Queued for retry');
      router.refresh();
    } catch {
      setMessage(ar ? 'تعذرت إعادة المحاولة؛ حدّث الصفحة' : 'Retry unavailable; refresh the page');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={retry} disabled={busy} className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-50">
        {busy ? (ar ? 'جارٍ التنفيذ…' : 'Retrying…') : (ar ? 'إعادة المحاولة' : 'Retry')}
      </button>
      {message && <span role="status" className="text-xs text-muted">{message}</span>}
    </div>
  );
}
