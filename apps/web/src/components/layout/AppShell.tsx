'use client';

import dynamic from 'next/dynamic';
import type { SessionUser } from '@ai-music/contracts';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { PlayerProvider } from '@/components/player/PlayerProvider';
import { ClientPerformance } from '@/components/providers/ClientPerformance';
import { PlayerBar } from '@/components/player/PlayerBar';
import { DeferredFullPlayer } from '@/components/player/DeferredFullPlayer';
import { DesktopTopBar } from '@/components/layout/DesktopTopBar';
import { DesktopChrome } from '@/components/layout/DesktopChrome';
import {
  MagicPathHomeSidebar,
  MagicPathHomeHeader,
  MagicPathHomeListeningRail,
  MagicPathHomeBottomPlayer,
} from '@/components/layout/MagicPathHomeChrome';
import '@/components/layout/magicpath-home-shell.css';
import { MobileHeader, MobileNav } from '@/components/layout/MobileNav';
import { Footer } from '@/components/layout/Footer';
import { useLocalePath } from '@/lib/use-locale-path';
import { AmbientBackground } from '@/components/visuals/AmbientBackground';
import { useT } from '@/i18n/use-translator';
import type { Locale } from '@ai-music/contracts';
import type { ContentLanguagePreference } from '@/lib/content-language';

// Guests never need onboarding: keep its JS out of their initial bundle.
const FavoriteGenresSelector = dynamic(
  () =>
    import('@/components/onboarding/FavoriteGenresSelector').then(
      (module) => module.FavoriteGenresSelector,
    ),
  { ssr: false },
);

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
  const musicBrowseRoutes = new Set([
    `/${locale}`,
    `/${locale}/`,
    `/${locale}/discover`,
    `/${locale}/search`,
    `/${locale}/genres`,
    `/${locale}/artists`,
    `/${locale}/podcasts`,
  ]);
  const useMagicPathShell = musicBrowseRoutes.has(pathname);
  const podcastMode =
    pathname === `/${locale}/podcasts` || pathname.startsWith(`/${locale}/podcasts/`);
  return (
    <SessionProvider user={user}>
      <ToastProvider>
        <PlayerProvider key={user?.id ?? 'guest'} viewerId={user?.id ?? null}>
          <ClientPerformance />
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
          >
            {locale === 'ar' ? 'تخطَّ إلى المحتوى الرئيسي' : 'Skip to main content'}
          </a>
          <AmbientBackground />
          {useMagicPathShell ? (
            <>
              <MagicPathHomeSidebar locale={locale} user={user} />
              <MagicPathHomeListeningRail locale={locale} />
            </>
          ) : (
            <DesktopChrome user={user} podcastMode={podcastMode} />
          )}
          <div
            className={`oddio-workspace relative z-10 w-full min-w-0 max-w-full overflow-x-clip ${useMagicPathShell ? 'mp2-workspace' : `lg:ps-[244px] ${podcastMode ? 'oddio-podcast-workspace 2xl:pe-0' : '2xl:pe-[300px]'}`}`}
          >
            {useMagicPathShell ? (
              <MagicPathHomeHeader
                locale={locale}
                user={user}
                contentLanguage={contentLanguage}
              />
            ) : (
              <>
                <MobileHeader user={user} contentLanguage={contentLanguage} />
                <DesktopTopBar contentLanguage={contentLanguage} />
                <PlayerBar podcastMode={podcastMode} />
              </>
            )}
            <main
              id="main"
              tabIndex={-1}
              className={`oddio-main-content mx-auto w-full max-w-[1720px] px-4 pt-6 sm:px-6 lg:px-7 2xl:px-8 pb-6 lg:pb-10`}
            >
              {children}
            </main>
            <Footer locale={locale} />
          </div>
          {useMagicPathShell ? <MagicPathHomeBottomPlayer locale={locale} /> : null}
          <DeferredFullPlayer />
          {!useMagicPathShell ? <MobileNav /> : null}
          {user ? (
            <FavoriteGenresSelector mode="welcome" locale={locale} userId={user.id} />
          ) : null}
        </PlayerProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
