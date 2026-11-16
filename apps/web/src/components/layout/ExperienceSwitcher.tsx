'use client';

import Link from 'next/link';
import { Headphones, Mic2 } from 'lucide-react';
import { useLocalePath } from '@/lib/use-locale-path';
import { usePlayer } from '@/lib/player-store';

/** A permanent, keyboard-accessible product switcher shared by both experiences. */
export function ExperienceSwitcher() {
  const { locale, pathname } = useLocalePath();
  const ar = locale === 'ar';
  const podcasts = pathname === `/${locale}/podcasts` || pathname.startsWith(`/${locale}/podcasts/`);
  const setPlaying = usePlayer((state) => state.setPlaying);

  return (
    <nav
      aria-label={ar ? 'اختيار نوع المحتوى' : 'Choose what to listen to'}
      className="sticky top-[65px] z-[29] flex w-full justify-center border-b border-white/10 bg-[#141019]/95 px-3 py-2 backdrop-blur-xl lg:top-[83px]"
    >
      <div className="grid w-full max-w-[430px] grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#211a27] p-1">
        <Link
          prefetch={false}
          href={`/${locale}`}
          aria-current={!podcasts ? 'page' : undefined}
          onClick={() => { /* Native podcast audio stops when its page unmounts. */ }}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#eab997] ${!podcasts ? 'bg-[#eab997] text-[#100d13]' : 'text-[#d0c4d6] hover:bg-white/10'}`}
        >
          <Headphones className="h-4 w-4" aria-hidden="true" />
          {ar ? 'موسيقى' : 'Music'}
        </Link>
        <Link
          prefetch={false}
          href={`/${locale}/podcasts`}
          aria-current={podcasts ? 'page' : undefined}
          onClick={() => setPlaying(false)}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#eab997] ${podcasts ? 'bg-[#eab997] text-[#100d13]' : 'text-[#d0c4d6] hover:bg-white/10'}`}
        >
          <Mic2 className="h-4 w-4" aria-hidden="true" />
          {ar ? 'بودكاست' : 'Podcasts'}
        </Link>
      </div>
    </nav>
  );
}
