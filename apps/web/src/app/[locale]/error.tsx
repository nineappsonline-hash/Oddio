'use client';

import { useEffect } from 'react';
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
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        {ar ? 'خطأ' : 'Error'}
      </p>
      <h1 className="mt-3 text-2xl font-bold text-ink">{ar ? 'حصلت مشكلة غير متوقعة' : 'Something went wrong'}</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        {ar ? 'الصفحة ما اتحملتش. جرب مرة تانية، أو ارجع للصفحة الرئيسية.' : 'The page failed to load. Try again or return to the homepage.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 min-h-11 rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-[#211518] hover:bg-primary-strong"
      >
        {ar ? 'حاول تاني' : 'Try again'}
      </button>
    </div>
  );
}
