'use client';

import { useEffect } from 'react';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[page]', error.message);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        Error
      </p>
      <h1 className="mt-3 text-2xl font-bold text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        The page failed to load. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-strong"
      >
        Try again
      </button>
    </div>
  );
}
