'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const ar = pathname?.startsWith('/ar') ?? false;
  useEffect(() => {
    console.error('[page]', error.message);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.035] px-6 py-12 text-center sm:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        {ar ? 'خطأ' : 'Error'}
      </p>
      <h1 className="mt-3 text-2xl font-bold text-ink">
        {ar ? 'حصلت مشكلة غير متوقعة' : 'Something went wrong'}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-7 text-muted">
        {ar
          ? 'الصفحة ما اتحملتش. جرب مرة تانية، أو ارجع للصفحة الرئيسية.'
          : 'The page failed to load. Try again or return to the homepage.'}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {ar ? 'حاول تاني' : 'Try again'}
        </button>
        <Link
          href={ar ? '/ar' : '/en'}
          className="inline-flex min-h-11 items-center rounded-pill border border-white/20 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {ar ? 'الصفحة الرئيسية' : 'Go home'}
        </Link>
      </div>
    </div>
  );
}
