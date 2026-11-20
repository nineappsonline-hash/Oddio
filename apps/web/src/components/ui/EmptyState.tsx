import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/[0.035] px-5 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.035)] sm:px-8 sm:py-12',
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
          <path
            d="M9 18V5l12-2v13"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </div>
      <h3 className="max-w-lg text-base font-bold leading-7 text-ink sm:text-lg">
        {title}
      </h3>
      {body ? <p className="mt-2 max-w-md text-sm leading-7 text-muted">{body}</p> : null}
      {action ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action}
        </div>
      ) : null}
    </div>
  );
}
