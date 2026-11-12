'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function HorizontalCarousel({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: false, right: true });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setPosition({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => { el.removeEventListener('scroll', update); observer.disconnect(); };
  }, []);
  const move = (direction: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(220, el.clientWidth * 0.75), behavior: 'smooth' });
  };
  return (
    <div className="relative">
      <div ref={ref} aria-label={label} className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-5 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      <button type="button" aria-label={`Scroll ${label} left`} onClick={() => move(-1)} disabled={!position.left}
        className="absolute left-0 top-1/2 z-20 flex h-10 w-10 -translate-x-1/3 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[#17122e]/95 text-white shadow-xl backdrop-blur transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-30">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" aria-label={`Scroll ${label} right`} onClick={() => move(1)} disabled={!position.right}
        className="absolute right-0 top-1/2 z-20 flex h-10 w-10 translate-x-1/3 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[#17122e]/95 text-white shadow-xl backdrop-blur transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-30">
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
