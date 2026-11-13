'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function TrackChangeModeration({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  async function decide(decision: 'approved' | 'rejected') {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/track-changes/' + encodeURIComponent(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Review failed');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Review failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        disabled={busy}
        onClick={() => void decide('approved')}
        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        Approve
      </button>
      <button
        disabled={busy}
        onClick={() => void decide('rejected')}
        className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        Reject
      </button>
      {message ? (
        <span role="alert" className="text-xs text-rose-300">
          {message}
        </span>
      ) : null}
    </div>
  );
}
