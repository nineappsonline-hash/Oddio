'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function ScrollingTrackTitle({
  href,
  title,
  active,
  rtl,
}: {
  href: string;
  title: string;
  active: boolean;
  rtl: boolean;
}) {
  const viewportRef = useRef<HTMLAnchorElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    const label = labelRef.current;
    if (!viewport || !label) return;

    const measure = () => {
      setOverflow(Math.max(0, Math.ceil(label.scrollWidth - viewport.clientWidth)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(label);
    return () => observer.disconnect();
  }, [title]);

  const moving = overflow > 3;
  const style = {
    '--oddio-title-travel': `${overflow}px`,
    '--oddio-title-duration': `${Math.max(9, Math.min(25, 6 + overflow / 18))}s`,
  } as CSSProperties;

  return (
    <Link
      ref={viewportRef}
      href={href}
      title={title}
      dir={rtl ? 'rtl' : 'ltr'}
      className={cn(
        'block w-full min-w-0 overflow-hidden text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
        active ? 'text-primary' : 'text-ink group-hover:text-ink',
      )}
    >
      <span
        ref={labelRef}
        style={style}
        className={cn(
          'inline-block max-w-none whitespace-nowrap align-bottom',
          moving && (rtl ? 'oddio-track-title-scroll-rtl' : 'oddio-track-title-scroll'),
        )}
      >
        {title}
      </span>
    </Link>
  );
}
