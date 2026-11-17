'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * A marquee that is only enabled when its title is actually clipped.
 * Single-line titles pan horizontally in their natural LTR/RTL direction.
 * Multi-line titles gently pan vertically to reveal every line.
 */
export function AutoScrollTitle({
  text,
  lines = 1,
  className = '',
}: {
  text: string;
  lines?: 1 | 2;
  className?: string;
}) {
  const viewportRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const [motion, setMotion] = useState({ distance: 0, duration: 12 });
  const rtl = /^[\s\p{P}\p{N}]*[\u0600-\u06FF]/u.test(text);
  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewportSize = lines === 1 ? viewport.clientWidth : viewport.clientHeight;
        const contentSize = lines === 1 ? content.scrollWidth : content.scrollHeight;
        const distance = Math.max(0, Math.ceil(contentSize - viewportSize));
        setMotion(current => {
          const next = {
            distance: distance > 2 ? distance : 0,
            duration: Math.max(9, Math.min(28, 7 + distance / 25)),
          };
          return current.distance === next.distance && current.duration === next.duration ? current : next;
        });
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(content);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [text, lines]);

  const vars = {
    '--oddio-auto-scroll-distance': `${motion.distance}px`,
    '--oddio-auto-scroll-duration': `${motion.duration}s`,
  } as CSSProperties;

  return (
    <span
      ref={viewportRef}
      dir={rtl ? 'rtl' : 'ltr'}
      title={text}
      className={`oddio-title-viewport block min-w-0 w-full overflow-hidden ${className}`}
      style={{ height: lines === 1 ? '1.5em' : '3em', lineHeight: 1.5 }}
    >
      <span
        ref={contentRef}
        style={vars}
        className={`oddio-title-content block ${lines === 1 ? 'whitespace-nowrap w-max max-w-none' : 'w-full break-words'} ${motion.distance > 0 ? (lines === 1 ? (rtl ? 'oddio-auto-scroll-rtl' : 'oddio-auto-scroll-ltr') : 'oddio-auto-scroll-vertical') : ''}`}
      >
        {text}
      </span>
    </span>
  );
}
