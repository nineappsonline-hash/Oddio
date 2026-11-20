'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Menu,
  User,
  X,
  Mic2,
  Settings,
  LogIn,
  UserPlus,
  ArrowUpRight,
  BarChart3,
  Shield,
  Globe2,
} from 'lucide-react';
import type { SessionUser } from '@ai-music/contracts';
import { useSession } from '@/components/providers/SessionProvider';
import { Avatar } from '@/components/ui/Artwork';
import { Logo } from '@/components/layout/Sidebar';
import { useT } from '@/i18n/use-translator';
import { useLocalePath } from '@/lib/use-locale-path';
import { Equalizer } from '@/components/visuals/Equalizer';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { ExperienceSwitcher } from '@/components/layout/ExperienceSwitcher';
import type { ContentLanguagePreference } from '@/lib/content-language';
import { cn } from '@/lib/utils';
import { OddioGlyph, type OddioGlyphName } from '@/components/ui/OddioGlyph';

export function MobileHeader({
  user,
  contentLanguage,
}: {
  user: SessionUser | null;
  contentLanguage: ContentLanguagePreference;
}) {
  const t = useT();
  const { locale } = useLocalePath();
  const session = useSession();
  const currentUser = session.user ?? user;
  const { pathname } = useLocalePath();
  const podcastMode =
    pathname === `/${locale}/podcasts` || pathname.startsWith(`/${locale}/podcasts/`);

  return (
    <header
      dir="ltr"
      className="sticky top-0 z-30 flex min-w-0 items-center justify-between gap-2 border-b border-white/10 bg-background/90 px-2.5 py-2.5 backdrop-blur-2xl lg:hidden"
    >
      <div className="flex min-w-0 shrink items-center gap-1.5">
        <button
          type="button"
          aria-label={locale === 'ar' ? 'افتح القائمة' : 'Open menu'}
          onClick={() => document.getElementById('oddio-mobile-menu-trigger')?.click()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#4c395f] bg-[#1e1925] text-[#eeeaf5] transition hover:border-[#a88ae7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a88ae7]"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="shrink-0 max-[359px]:hidden [&_img]:!w-[82px]">
          <Logo locale={locale} compact />
        </div>
        <div className="hidden sm:block">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-ink">Oddio</p>
          <div className="flex items-center gap-1.5">
            <Equalizer bars={3} className="h-2.5 text-primary" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted">
              {locale === 'ar' ? 'موسيقى ليك' : 'YOUR MUSIC'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex min-w-0 shrink-0 items-center gap-1">
        <ExperienceSwitcher contentLanguage={contentLanguage} variant="mobile" />
        <Link
          prefetch={false}
          href={podcastMode ? `/${locale}/podcasts` : `/${locale}/search`}
          className="hidden rounded-full p-2.5 text-muted transition hover:bg-white/10 hover:text-ink sm:inline-flex"
          aria-label={t('nav.search')}
        >
          <OddioGlyph name="search" size={21} className="oddio-glyph" />
        </Link>
        {currentUser ? (
          <>
            <Link
              prefetch={false}
              href={`/${locale}/notifications`}
              className="hidden rounded-full p-2.5 text-muted transition hover:bg-white/10 hover:text-ink sm:inline-flex"
              aria-label={t('nav.notifications')}
            >
              <OddioGlyph name="notifications" size={21} className="oddio-glyph" />
            </Link>
            <Link
              prefetch={false}
              href={`/${locale}/settings`}
              aria-label={t('nav.settings')}
            >
              <Avatar name={currentUser.displayName} className="h-9 w-9" />
            </Link>
          </>
        ) : (
          <Link
            prefetch={false}
            href={`/${locale}/login`}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#4c395f] bg-[#1e1925] text-[#ddd4e8] transition hover:border-[#a88ae7] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a88ae7] sm:w-auto sm:gap-2 sm:px-3"
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">{t('nav.login')}</span>
          </Link>
        )}
      </div>
    </header>
  );
}

export function MobileNav() {
  const t = useT();
  const { locale, pathname } = useLocalePath();
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const podcastMode =
    pathname === `/${locale}/podcasts` || pathname.startsWith(`/${locale}/podcasts/`);
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(
      dialog?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]',
      ) ?? [],
    ).filter((element) => element.getClientRects().length > 0);
    focusable()[0]?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [menuOpen]);

  const items = podcastMode
    ? [
        {
          href: `/${locale}/podcasts`,
          label: locale === 'ar' ? 'بودكاست' : 'Podcasts',
          icon: 'home',
          exact: true,
        },
        {
          href: `/${locale}/podcasts/categories`,
          label: locale === 'ar' ? 'تصنيفات' : 'Categories',
          icon: 'discover',
        },
        {
          href: `/${locale}/podcasts?q=`,
          label: locale === 'ar' ? 'بحث' : 'Search',
          icon: 'search',
        },
        {
          href: `/${locale}`,
          label: locale === 'ar' ? 'موسيقى' : 'Music',
          icon: 'soundspace',
          exact: true,
        },
      ]
    : [
        { href: `/${locale}`, label: t('nav.home'), icon: 'home', exact: true },
        { href: `/${locale}/soundspace`, label: 'Soundspace', icon: 'soundspace' },
        { href: `/${locale}/search`, label: t('nav.search'), icon: 'search' },
        user
          ? {
              href: `/${locale}/library`,
              label: t('nav.library'),
              icon: 'library',
              exact: false,
            }
          : {
              href: `/${locale}/charts`,
              label: t('nav.charts'),
              icon: 'library',
              exact: false,
            },
      ];

  return (
    <>
      <nav
        aria-label={t('nav.main')}
        className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(72px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-white/10 bg-[#19131e]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl lg:hidden"
      >
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const glyph = item.icon as OddioGlyphName;
          return (
            <Link
              prefetch={false}
              key={item.href + item.label}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group/mnav relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden px-1 py-2 text-center text-[10px] font-semibold leading-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary',
                active ? 'text-primary' : 'text-muted hover:text-ink',
              )}
            >
              {active ? (
                <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary" />
              ) : null}
              <OddioGlyph name={glyph} size={22} className="oddio-glyph shrink-0" />
              <span className="w-full truncate px-0.5">{item.label}</span>
            </Link>
          );
        })}
        <button
          id="oddio-mobile-menu-trigger"
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label={locale === 'ar' ? 'القائمة' : 'Menu'}
          aria-expanded={menuOpen}
          className={cn(
            'flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden px-1 py-2 text-[10px] font-semibold leading-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary',
            menuOpen ? 'text-[#eab997]' : 'text-muted hover:text-ink',
          )}
        >
          <Menu className="h-5 w-5" />
          <span className="w-full truncate px-0.5">{locale === 'ar' ? 'القائمة' : 'Menu'}</span>
        </button>
      </nav>
      {menuOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            aria-label={locale === 'ar' ? 'إغلاق القائمة' : 'Close menu'}
            onClick={() => setMenuOpen(false)}
          />
          <section
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={locale === 'ar' ? 'القائمة' : 'Menu'}
            className="absolute inset-y-0 left-0 flex w-[min(88vw,360px)] flex-col overflow-y-auto overscroll-contain border-e border-[#604b83]/50 bg-[#101015] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] shadow-[15px_0_80px_rgba(0,0,0,0.65)]"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image
                  src="/oddio-gradient-play-logo.png"
                  alt="Oddio"
                  width={112}
                  height={42}
                  className="h-12 w-28 object-contain"
                  priority
                />
                <h2 className="text-base font-bold text-[#ded7eb]">
                  {locale === 'ar' ? 'القائمة الرئيسية' : 'Main Menu'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}
                className="rounded-xl border border-white/10 bg-white/10 p-2 text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {!user?.isArtistManager ? (
              <Link
                prefetch={false}
                href={`/${locale}/apply/artist`}
                onClick={() => setMenuOpen(false)}
                className="mb-4 flex items-center gap-3 rounded-2xl border border-[#8461b8]/60 bg-gradient-to-r from-[#38264f] via-[#29203f] to-[#15384a] px-4 py-4 font-bold text-white shadow-[0_8px_26px_rgba(90,54,156,0.22)] transition hover:border-[#b29be1] hover:brightness-125"
              >
                <Mic2 className="h-6 w-6" />
                <span className="flex-1">
                  {locale === 'ar' ? 'كن فنانًا' : 'Become an Artist'}
                </span>
                <ArrowUpRight className="h-5 w-5" />
              </Link>
            ) : null}
            <div className="grid gap-2">
              {[
                ...(podcastMode
                  ? [
                      {
                        href: `/${locale}/podcasts`,
                        label: locale === 'ar' ? 'الرئيسية' : 'Podcasts home',
                        icon: 'home',
                      },
                      {
                        href: `/${locale}/podcasts/categories`,
                        label:
                          locale === 'ar' ? 'تصنيفات البودكاست' : 'Podcast categories',
                        icon: 'discover',
                      },
                      {
                        href: `/${locale}/podcasts#series`,
                        label: locale === 'ar' ? 'سلاسل البودكاست' : 'Podcast series',
                        icon: 'library',
                      },
                      {
                        href: `/${locale}/podcasts/creators`,
                        label: locale === 'ar' ? 'فنانو البودكاست' : 'Podcast creators',
                        icon: 'studio',
                      },
                      ...(user?.isArtistManager ||
                      user?.roles.some(
                        (role) => role === 'super_admin' || role === 'admin',
                      )
                        ? [
                            {
                              href: `/${locale}/podcasts/me`,
                              label:
                                locale === 'ar' ? 'صفحتي كفنان' : 'My podcast profile',
                              icon: 'studio',
                            },
                            {
                              href: `/${locale}/podcasts/manage`,
                              label:
                                locale === 'ar' ? 'استوديو البودكاست' : 'Podcast Studio',
                              icon: 'studio',
                            },
                          ]
                        : [
                            {
                              href: user
                                ? `/${locale}/apply/artist`
                                : `/${locale}/signup`,
                              label:
                                locale === 'ar'
                                  ? 'ابدأ بودكاست كفنان'
                                  : 'Become a podcast creator',
                              icon: 'studio',
                            },
                          ]),
                    ]
                  : []),
                ...(!podcastMode
                  ? [
                      { href: `/${locale}`, label: t('nav.home'), icon: 'home' },
                      {
                        href: `/${locale}/discover`,
                        label: t('nav.discover'),
                        icon: 'discover',
                      },
                      {
                        href: `/${locale}/soundspace`,
                        label: locale === 'ar' ? 'مساحتك الموسيقية' : 'Soundspace',
                        icon: 'soundspace',
                      },
                      {
                        href: `/${locale}/charts`,
                        label: t('nav.charts'),
                        icon: 'charts',
                      },
                      {
                        href: `/${locale}/search`,
                        label: t('nav.search'),
                        icon: 'search',
                      },
                      {
                        href: `/${locale}/genres`,
                        label: locale === 'ar' ? 'الأنواع الموسيقية' : 'Genres',
                        icon: 'discover',
                      },
                    ]
                  : [
                      {
                        href: `/${locale}`,
                        label: locale === 'ar' ? 'الموسيقى' : 'Music',
                        icon: 'soundspace',
                      },
                    ]),
                ...(user
                  ? [
                      {
                        href: `/${locale}/library`,
                        label: t('nav.library'),
                        icon: 'library',
                      },
                      {
                        href: `/${locale}/notifications`,
                        label: t('nav.notifications'),
                        icon: Bell,
                      },
                      {
                        href: `/${locale}/settings`,
                        label: t('nav.settings'),
                        icon: Settings,
                      },
                    ]
                  : []),
                ...(!podcastMode && user?.isArtistManager
                  ? [
                      {
                        href: `/${locale}/studio`,
                        label: t('nav.studio'),
                        icon: Mic2,
                      },
                    ]
                  : []),

                ...(user && user.roles.length > 0
                  ? [
                      {
                        href: `/${locale}/admin`,
                        label: t('nav.admin'),
                        icon: Shield,
                      },
                    ]
                  : []),
                ...(!user
                  ? [
                      {
                        href: `/${locale}/signup`,
                        label: locale === 'ar' ? 'إنشاء حساب' : 'Create account',
                        icon: UserPlus,
                      },
                    ]
                  : []),
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  prefetch={false}
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'flex min-h-12 items-center gap-3 rounded-xl border px-3.5 text-sm font-semibold transition',
                    pathname === href
                      ? 'border-[#7e64b3]/60 bg-[#292139] text-white'
                      : 'border-[#35323e] bg-[#1b1b22] text-[#e9e7ef] hover:border-[#79649c] hover:bg-[#282331]',
                  )}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#4b405d] bg-[#292335] text-[#c4aceb]">
                    {typeof Icon === 'string' ? (
                      <OddioGlyph
                        name={Icon as OddioGlyphName}
                        size={19}
                        className="oddio-glyph"
                      />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </span>
                  {label}
                </Link>
              ))}
            </div>
            <div className="mt-5 border-t border-white/10 pt-4">
              <LocaleSwitcher />
            </div>
            {!user ? (
              <Link
                prefetch={false}
                href={`/${locale}/login`}
                onClick={() => setMenuOpen(false)}
                className="oddio-login-cta mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-black text-white"
              >
                <LogIn className="h-4 w-4" />
                {t('nav.login')}
              </Link>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
