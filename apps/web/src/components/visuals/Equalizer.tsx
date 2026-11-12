import { cn } from '@/lib/utils';

const heights = [62, 100, 76, 44, 88, 56, 96, 68];

export function Equalizer({
  bars = 4,
  paused = false,
  className,
}: {
  bars?: number;
  paused?: boolean;
  className?: string;
}) {
  return (
    <span aria-hidden="true" data-paused={paused} className={cn('equalizer', className)}>
      {Array.from({ length: bars }).map((_, index) => (
        <span key={index} style={{ height: `${heights[index % heights.length]}%` }} />
      ))}
    </span>
  );
}
