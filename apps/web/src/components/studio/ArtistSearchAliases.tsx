'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/client-api';

export function ArtistSearchAliases({
  artistId,
  initial,
  locale,
}: {
  artistId: string;
  initial: string[];
  locale: 'en' | 'ar';
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial.join('\n'));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const ar = locale === 'ar';

  const save = async () => {
    setBusy(true);
    setMessage('');
    const aliases = value
      .split(/[,\n]+/)
      .map((alias) => alias.trim())
      .filter(Boolean);
    try {
      await apiRequest(`/api/artists/${artistId}/aliases`, {
        method: 'PUT',
        body: JSON.stringify({ aliases }),
      });
      setMessage(ar ? 'تم حفظ الأسماء البديلة' : 'Search aliases saved');
      router.refresh();
    } catch {
      setMessage(
        ar
          ? 'تعذر الحفظ. راجع الأسماء وحاول مرة أخرى.'
          : 'Could not save aliases. Check the names and retry.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card mt-6 space-y-3 p-5">
      <h2 className="text-lg font-bold text-ink">
        {ar ? 'أسماء الفنان البديلة في البحث' : 'Alternate artist search names'}
      </h2>
      <p className="text-sm text-muted">
        {ar
          ? 'اكتب الأسماء والتهجئات اللي أنت بتستخدمها فعلًا بالعربي أو الإنجليزي، اسم في كل سطر (بحد أقصى 8).'
          : 'Add spellings you actually use in Arabic or English, one per line (up to 8).'}
      </p>
      <textarea
        aria-label={ar ? 'الأسماء البديلة' : 'Alternate names'}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={4}
        maxLength={750}
        className="input w-full"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? (ar ? 'جاري الحفظ…' : 'Saving…') : ar ? 'حفظ الأسماء' : 'Save aliases'}
      </button>
      {message ? (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      ) : null}
    </section>
  );
}
