'use client';

import { useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Layers3 } from 'lucide-react';

type Props = {
  locale: 'ar' | 'en';
  count: number;
  children: ReactNode;
};

/**
 * The shelf scrolls horizontally without introducing page-level overflow.
 * Cards are rendered on the server from published podcast series only.
 */
export function PodcastSeriesShelf({ locale, count, children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const ar = locale === 'ar';

  function move(direction: -1 | 1) {
    const element = scrollRef.current;
    if (!element) return;
    const card = element.querySelector<HTMLElement>('[data-podcast-series-card]');
    const travel = (card?.offsetWidth ?? 232) + 16;
    element.scrollBy({
      left: (ar ? -1 : 1) * direction * travel * 2,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }

  return (
    <section
      id="series"
      aria-labelledby="podcast-series-heading"
      className="min-w-0 space-y-4"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2
            id="podcast-series-heading"
            className="text-2xl font-bold text-white sm:text-[27px]"
          >
            {ar ? 'سلاسل البودكاست' : 'Podcast Series'}
          </h2>
          <p className="text-sm leading-6 text-[#a3a3a3]">
            {ar
              ? 'كل موضوع وحلقاته في سلسلة واحدة.'
              : 'Themed shows, all their episodes in one place.'}
          </p>
        </div>
        {count > 1 ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label={ar ? 'السلاسل السابقة' : 'Previous podcast series'}
              className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/[0.07] backdrop-blur-xl text-[#e9e9e9] transition hover:border-[#e9e9e9]/60 hover:bg-white/[0.13] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e9e9e9]"
            >
              {ar ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label={ar ? 'السلاسل التالية' : 'Next podcast series'}
              className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/[0.07] backdrop-blur-xl text-[#e9e9e9] transition hover:border-[#e9e9e9]/60 hover:bg-white/[0.13] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e9e9e9]"
            >
              {ar ? (
                <ChevronLeft className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>
          </div>
        ) : null}
      </div>
      {count > 0 ? (
        <div
          ref={scrollRef}
          dir={ar ? 'rtl' : 'ltr'}
          tabIndex={0}
          aria-label={ar ? 'تصفح سلاسل البودكاست' : 'Browse podcast series'}
          className="-mx-1 flex min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-1 pb-3 [scrollbar-width:thin] [scrollbar-color:#555555_transparent] focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e9e9e9]"
        >
          {children}
        </div>
      ) : (
        <div className="flex min-h-[126px] items-center gap-4 rounded-2xl border border-dashed border-white/20 bg-white/[0.07] backdrop-blur-xl/75 p-5">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/[0.09] text-[#e9e9e9]"
            aria-hidden="true"
          >
            <Layers3 className="h-7 w-7" />
          </span>
          <p className="text-sm leading-7 text-[#a3a3a3]">
            {ar
              ? 'سلاسل البودكاست الجديدة هتظهر هنا أول ما الفنانين ينشروها.'
              : 'New podcast series will appear here as artists publish them.'}
          </p>
        </div>
      )}
    </section>
  );
}
