'use client';

import type { SessionUser } from '@ai-music/contracts';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { PlayerProvider } from '@/components/player/PlayerProvider';
import { PlayerBar } from '@/components/player/PlayerBar';
import { FullPlayer } from '@/components/player/FullPlayer';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileHeader, MobileNav } from '@/components/layout/MobileNav';
import { Footer } from '@/components/layout/Footer';
import { AmbientBackground } from '@/components/visuals/AmbientBackground';
import { useT } from '@/i18n/use-translator';
import type { Locale } from '@ai-music/contracts';

export function AppShell({
  locale,
  user,
  children,
}: {
  locale: Locale;
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <SessionProvider user={user}>
      <ToastProvider>
        <PlayerProvider key={user?.id ?? 'guest'} viewerId={user?.id ?? null}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
          >
            {t('app.tagline')}
          </a>
          <AmbientBackground />
          <Sidebar user={user} />
          <div className="relative z-10 lg:ps-64">
            <MobileHeader user={user} />
            <main
              id="main"
              className="mx-auto max-w-7xl px-4 pb-48 pt-6 sm:px-6 lg:px-8 lg:pb-32"
            >
              {children}
            </main>
            <Footer locale={locale} />
          </div>
          <PlayerBar />
          <FullPlayer />
          <MobileNav />
        </PlayerProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
