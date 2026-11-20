'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Check, ChevronDown, Globe2, Headphones, Mic2 } from 'lucide-react';
import { useLocalePath } from '@/lib/use-locale-path';
import { usePlayer } from '@/lib/player-store';
import type { ContentLanguagePreference } from '@/lib/content-language';

type Props = {
  contentLanguage: ContentLanguagePreference;
  variant?: 'desktop' | 'mobile';
};

/**
 * Controls live INSIDE the existing top menu bar, not in a second sticky row.
 * The mobile variant uses two small popovers; desktop uses quiet inline tabs.
 */
export function ExperienceSwitcher({ contentLanguage, variant = 'desktop' }: Props) {
  const { locale, pathname } = useLocalePath();
  const ar = locale === 'ar';
  const isMobile = variant === 'mobile';
  const podcasts =
    pathname === `/${locale}/podcasts` || pathname.startsWith(`/${locale}/podcasts/`);
  const setPlaying = usePlayer((state) => state.setPlaying);
  const productMenuRef = useRef<HTMLDetailsElement>(null);
  const languageMenuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    productMenuRef.current?.removeAttribute('open');
    languageMenuRef.current?.removeAttribute('open');
  }, [pathname]);

  useEffect(() => {
    const handleOutsideClick = (event: PointerEvent) => {
      const node = event.target;
      if (!(node instanceof Node)) return;
      if (productMenuRef.current && !productMenuRef.current.contains(node))
        productMenuRef.current.removeAttribute('open');
      if (languageMenuRef.current && !languageMenuRef.current.contains(node))
        languageMenuRef.current.removeAttribute('open');
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  const itemClass =
    'flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-start text-xs font-semibold text-[#eeeaf5] transition hover:bg-[#352b43] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a88ae7]';

  const musicLink = (
    <Link
      href={`/${locale}`}
      prefetch={false}
      aria-current={!podcasts ? 'page' : undefined}
      onClick={() => productMenuRef.current?.removeAttribute('open')}
      className={`${itemClass} ${!podcasts ? 'bg-[#403354] text-white' : ''}`}
    >
      <Headphones className="h-3.5 w-3.5 shrink-0 text-[#a88ae7]" aria-hidden="true" />
      <span className="flex-1">{ar ? 'موسيقى' : 'Music'}</span>
      {!podcasts ? (
        <Check className="h-3.5 w-3.5 text-[#a88ae7]" aria-hidden="true" />
      ) : null}
    </Link>
  );
  const podcastLink = (
    <Link
      href={`/${locale}/podcasts`}
      prefetch={false}
      aria-current={podcasts ? 'page' : undefined}
      onClick={() => {
        setPlaying(false);
        productMenuRef.current?.removeAttribute('open');
      }}
      className={`${itemClass} ${podcasts ? 'bg-[#403354] text-white' : ''}`}
    >
      <Mic2 className="h-3.5 w-3.5 shrink-0 text-[#a88ae7]" aria-hidden="true" />
      <span className="flex-1">{ar ? 'بودكاست' : 'Podcasts'}</span>
      {podcasts ? (
        <Check className="h-3.5 w-3.5 text-[#a88ae7]" aria-hidden="true" />
      ) : null}
    </Link>
  );

  return (
    <div
      className={`oddio-header-switches flex min-w-0 shrink-0 items-center gap-1.5 ${isMobile ? 'oddio-header-switches-mobile' : ''}`}
    >
      {isMobile ? (
        <details ref={productMenuRef} className="group relative">
          <summary
            aria-label={ar ? 'اختار موسيقى أو بودكاست' : 'Choose Music or Podcasts'}
            className="flex h-9 cursor-pointer list-none items-center gap-1 rounded-lg border border-[#373042] bg-[#1e1925] px-2 text-[11px] font-semibold text-[#eeeaf5] transition hover:border-[#6c568d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a88ae7] [&::-webkit-details-marker]:hidden"
          >
            {podcasts ? (
              <Mic2 className="h-3.5 w-3.5 text-[#a88ae7]" />
            ) : (
              <Headphones className="h-3.5 w-3.5 text-[#a88ae7]" />
            )}
            <span className="hidden min-[420px]:inline">
              {podcasts ? (ar ? 'بودكاست' : 'Podcast') : ar ? 'موسيقى' : 'Music'}
            </span>
            <ChevronDown className="h-3 w-3 text-[#a88ae7] transition group-open:rotate-180" />
          </summary>
          <div className="absolute end-0 top-[calc(100%+8px)] z-[80] w-[190px] rounded-xl border border-[#443653] bg-[#1e1925] p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.65)]">
            {musicLink}
            {podcastLink}
          </div>
        </details>
      ) : (
        <nav
          aria-label={ar ? 'قسم المحتوى' : 'Content section'}
          className="flex h-9 items-center gap-0.5 rounded-lg border border-[#373042] bg-[#1e1925] p-1"
        >
          <Link
            href={`/${locale}`}
            prefetch={false}
            aria-current={!podcasts ? 'page' : undefined}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a88ae7] ${!podcasts ? 'bg-[#403354] text-white' : 'text-[#b8adbf] hover:text-white'}`}
          >
            <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
            {ar ? 'موسيقى' : 'Music'}
          </Link>
          <Link
            href={`/${locale}/podcasts`}
            prefetch={false}
            aria-current={podcasts ? 'page' : undefined}
            onClick={() => setPlaying(false)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a88ae7] ${podcasts ? 'bg-[#403354] text-white' : 'text-[#b8adbf] hover:text-white'}`}
          >
            <Mic2 className="h-3.5 w-3.5" aria-hidden="true" />
            {ar ? 'بودكاست' : 'Podcasts'}
          </Link>
        </nav>
      )}
      <details ref={languageMenuRef} className="group relative">
        <summary
          aria-label={ar ? 'فلتر لغة المحتوى' : 'Content language filter'}
          title={ar ? 'لغة المحتوى' : 'Content language'}
          className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-[#373042] bg-[#1e1925] px-2.5 text-[11px] font-semibold text-[#ddd4e8] transition hover:border-[#6c568d] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a88ae7] [&::-webkit-details-marker]:hidden"
        >
          <Globe2 className="h-3.5 w-3.5 shrink-0 text-[#a88ae7]" aria-hidden="true" />
          <span>
            {contentLanguage === 'ar' ? (ar ? 'عربي' : 'AR') : ar ? 'الكل' : 'AR+EN'}
          </span>
          <ChevronDown
            className="h-3 w-3 shrink-0 text-[#a88ae7] transition group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="absolute end-0 top-[calc(100%+8px)] z-[80] w-[205px] rounded-xl border border-[#443653] bg-[#1e1925] p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.65)]">
          {(['ar', 'all'] as const).map((value) => (
            <form key={value} action="/api/preferences/content-language" method="post">
              <input name="language" type="hidden" value={value} />
              <input name="returnTo" type="hidden" value={pathname} />
              <button
                type="submit"
                aria-pressed={contentLanguage === value}
                className={`${itemClass} ${contentLanguage === value ? 'bg-[#403354] text-white' : ''}`}
              >
                <span className="flex-1">
                  {value === 'ar'
                    ? ar
                      ? 'عربي فقط'
                      : 'Arabic only'
                    : ar
                      ? 'عربي + إنجليزي'
                      : 'Arabic + English'}
                </span>
                {contentLanguage === value ? (
                  <Check className="h-3.5 w-3.5 text-[#a88ae7]" aria-hidden="true" />
                ) : null}
              </button>
            </form>
          ))}
        </div>
      </details>
    </div>
  );
}
