import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div>
        {eyebrow ? (
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          <span className="text-glow-gradient">{title}</span>
        </h1>
        <span className="mt-3 block h-px w-24 bg-gradient-to-r from-primary via-cyan to-transparent" />
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm text-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
