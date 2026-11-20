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

  async function exportImage() {
    if (!text) return;
    setStatus('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      const gradient = context.createLinearGradient(0, 0, 1080, 1350);
      gradient.addColorStop(0, '#49316a');
      gradient.addColorStop(0.55, '#1c203d');
      gradient.addColorStop(1, '#12434b');
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.textAlign = ar ? 'right' : 'left';
      context.direction = ar ? 'rtl' : 'ltr';
      const x = ar ? 965 : 115;
      context.fillStyle = '#d8b4fe';
      context.font = 'bold 42px sans-serif';
      context.fillText('ODDIO  /  REWIND', x, 155);
      context.fillStyle = '#ffffff';
      context.font = 'bold 112px sans-serif';
      context.fillText(String(report.year), x, 315);
      context.font = 'bold 58px sans-serif';
      context.fillText(ar ? 'حصادي الموسيقي' : 'My listening year', x, 420);
      const lines = text.split('\\n').slice(1);
      context.font = '37px sans-serif';
      context.fillStyle = '#e5e7eb';
      let y = 560;
      for (const line of lines) {
        // Wrap long rows by measured words without truncation.
        const words = line.split(/\\s+/);
        let row = '';
        for (const word of words) {
          const candidate = row ? row + ' ' + word : word;
          if (context.measureText(candidate).width > 850 && row) {
            context.fillText(row, x, y);
            y += 76;
            row = word;
          } else {
            row = candidate;
          }
        }
        if (row) {
          context.fillText(row, x, y);
          y += 100;
        }
      }
      context.fillStyle = '#c4b5fd';
      context.font = '30px sans-serif';
      context.fillText('oddio.online', x, 1260);
      const image = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG unavailable')), 'image/png');
      });
      const url = URL.createObjectURL(image);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `oddio-rewind-${report.year}.png`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      setStatus(ar ? 'الصورة اتحفظت على جهازك. مفيش بيانات اترفعت للسيرفر.' : 'PNG saved to your device. No listening data was uploaded.');
    } catch {
      setStatus(ar ? 'مش قادرين نحفظ الصورة على الجهاز ده.' : 'Image export is unavailable on this device.');
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
      <button type="button" onClick={() => void exportImage()}
        className="mt-4 ms-2 inline-flex min-h-11 items-center justify-center rounded-full border border-white/30 px-5 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        {ar ? 'احفظ صورة PNG' : 'Save PNG image'}
      </button>
      {status ? <p role="status" className="mt-2 text-xs text-white/75">{status}</p> : null}
    </section>
  );
}
