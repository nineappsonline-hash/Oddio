'use client';

import type { SessionUser } from '@ai-music/contracts';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { PlayerProvider } from '@/components/player/PlayerProvider';
import { PlayerBar } from '@/components/player/PlayerBar';
import { DeferredFullPlayer } from '@/components/player/DeferredFullPlayer';
import { Sidebar } from '@/components/layout/Sidebar';
import { DesktopTopBar } from '@/components/layout/DesktopTopBar';
import { ListeningRail } from '@/components/layout/ListeningRail';
import { MobileHeader, MobileNav } from '@/components/layout/MobileNav';
import { Footer } from '@/components/layout/Footer';
import { useLocalePath } from '@/lib/use-locale-path';
import { AmbientBackground } from '@/components/visuals/AmbientBackground';
import { useT } from '@/i18n/use-translator';
import type { Locale } from '@ai-music/contracts';
import type { ContentLanguagePreference } from '@/lib/content-language';

export function AppShell({
  locale,
  user,
  children,
  contentLanguage,
}: {
  locale: Locale;
  contentLanguage: ContentLanguagePreference;
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  const t = useT();
  const { pathname } = useLocalePath();
  const podcastMode = pathname === `/${locale}/podcasts` || pathname.startsWith(`/${locale}/podcasts/`);
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
          <div className={`oddio-workspace relative z-10 lg:ps-[244px] ${podcastMode ? "oddio-podcast-workspace 2xl:pe-0" : "2xl:pe-[300px]"}`}>
            <MobileHeader user={user} contentLanguage={contentLanguage} />
            <DesktopTopBar contentLanguage={contentLanguage} />
            <main
              id="main"
              className={`oddio-main-content mx-auto w-full max-w-[1720px] px-4 pt-6 sm:px-6 lg:px-7 2xl:px-8 pb-48 lg:pb-36`}
            >
              {children}
            </main>
            <Footer locale={locale} />
          </div>
          {!podcastMode ? <ListeningRail /> : null}
          <PlayerBar podcastMode={podcastMode} />
          <DeferredFullPlayer />
          <MobileNav />
        </PlayerProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
