'use client';

import { useMemo, useState } from 'react';
import type { ListeningDNA } from '@/lib/data/annual-listening-dna';
import { annualShareText } from '@/lib/annual-share';

export function ShareAnnualRewind({
  report,
  locale,
}: {
  report: ListeningDNA;
  locale: 'ar' | 'en';
}) {
  const ar = locale === 'ar';
  const [includeTopArtist, setIncludeTopArtist] = useState(false);
  const [includeTopGenre, setIncludeTopGenre] = useState(false);
  const [status, setStatus] = useState('');
  const text = useMemo(() => annualShareText(report, locale, {
    includeTopArtist, includeTopGenre,
  }), [report, locale, includeTopArtist, includeTopGenre]);

  async function share() {
    if (!text) return;
    setStatus('');
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: ar ? `حصادي الموسيقي ${report.year} على Oddio` : `My ${report.year} Oddio Rewind`,
          text,
        });
        setStatus(ar ? 'تم فتح خيارات المشاركة.' : 'Share options opened.');
      } else {
        await navigator.clipboard.writeText(text);
        setStatus(ar ? 'تم نسخ نص البطاقة. شاركه بنفسك في المكان اللي تختاره.' : 'Card text copied. Share it wherever you choose.');
      }
    } catch (error) {
      setStatus(error instanceof Error && error.name === 'AbortError'
        ? (ar ? 'تم إلغاء المشاركة.' : 'Sharing cancelled.')
        : (ar ? 'المشاركة مش متاحة حاليًا.' : 'Sharing is unavailable right now.'));
    }
  }

  if (!text) return null;

  return (
    <section className="rounded-3xl border border-violet-400/30 bg-gradient-to-br from-[#31234b] via-[#191b35] to-[#132b32] p-5 sm:p-7" aria-labelledby="rewind-share-heading">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-violet-200">ODDIO REWIND · {report.year}</p>
      <h2 id="rewind-share-heading" className="mt-2 text-xl font-bold text-white">
        {ar ? 'شارك حصادك بطريقتك' : 'Share your year, your way'}
      </h2>
      <p className="mt-2 text-sm leading-6 text-white/75">
        {ar
          ? 'الملخص خاص بيك. اختار بنفسك المعلومات اللي تحب تظهر، وبعدين اضغط مشاركة. مفيش نشر تلقائي أو لينك يكشف تاريخ استماعك.'
          : 'Your recap is private. Choose what to include, then share manually. No automatic posting or public link to your listening history.'}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          { checked: includeTopArtist, change: setIncludeTopArtist, label: ar ? 'ضيف اسم الفنان الأكثر استماعًا' : 'Include top artist' },
          { checked: includeTopGenre, change: setIncludeTopGenre, label: ar ? 'ضيف النوع الموسيقي المفضل' : 'Include top genre' },
        ].map((choice) => (
          <label key={choice.label} className="flex min-h-11 items-center gap-3 rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm text-white">
            <input type="checkbox" checked={choice.checked} onChange={(event) => choice.change(event.target.checked)} className="h-4 w-4 accent-violet-400" />
            {choice.label}
          </label>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-white/20 bg-black/30 p-5" aria-label={ar ? 'معاينة نص المشاركة' : 'Share preview'}>
        <pre dir={ar ? 'rtl' : 'ltr'} className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-white">{text}</pre>
      </div>
      <button type="button" onClick={() => void share()}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-[#211518] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        {ar ? 'شارك البطاقة' : 'Share card'}
      </button>
      {status ? <p role="status" className="mt-2 text-xs text-white/75">{status}</p> : null}
    </section>
  );
}
