'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/client-api';

export function ClearListeningHistory({ locale }: { locale: 'ar' | 'en' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isArabic = locale === 'ar';

  const clear = async () => {
    const agreed = window.confirm(
      isArabic
        ? 'مسح سجل الاستماع؟ هيتم حذف جلسات التشغيل وأحداثها من حسابك نهائيًا. إحصائيات الأغاني الإجمالية هتفضل موجودة.'
        : 'Delete listening history? Your playback sessions and underlying events will be erased permanently. Aggregate song statistics are retained.',
    );
    if (!agreed) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest('/api/library/history', { method: 'DELETE' });
      router.refresh();
    } catch {
      setError(isArabic ? 'تعذر مسح السجل. جرّب مرة أخرى.' : 'Could not erase history. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void clear()}
        disabled={busy}
        className="min-h-11 rounded-xl border border-red-400/40 px-4 text-xs font-semibold text-red-200 hover:bg-red-400/10 disabled:opacity-50"
      >
        {busy ? (isArabic ? 'جاري المسح…' : 'Deleting…') : (isArabic ? 'مسح سجل الاستماع' : 'Delete listening history')}
      </button>
      {error ? <span role="alert" className="text-xs text-red-200">{error}</span> : null}
    </div>
  );
}
