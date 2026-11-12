import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-5 flex items-end justify-between gap-4', className)}>
      <div className="flex items-start gap-3">
        <span className="mt-1 h-7 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary via-cyan to-coral shadow-glow" />
        <div>
          <h2 className="text-xl font-black tracking-tight text-ink sm:text-2xl">
            {title}
          </h2>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
