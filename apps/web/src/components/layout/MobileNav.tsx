'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
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
import { cn } from '@/lib/utils';
import { OddioGlyph, type OddioGlyphName } from '@/components/ui/OddioGlyph';

export function MobileHeader({ user }: { user: SessionUser | null }) {
  const t = useT();
  const { locale } = useLocalePath();
  const session = useSession();
  const currentUser = session.user ?? user;

  return (
    <header
      dir="ltr"
      className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-background/70 px-4 py-3 backdrop-blur-2xl lg:hidden"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          aria-label={locale === 'ar' ? 'افتح القائمة' : 'Open menu'}
          onClick={() => document.getElementById('oddio-mobile-menu-trigger')?.click()}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#eab99750] bg-[#262626] text-[#eaeaea] transition hover:bg-[#383838] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#eab997]"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Logo locale={locale} compact />
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-ink">Oddio</p>
          <div className="flex items-center gap-1.5">
            <Equalizer bars={3} className="h-2.5 text-primary" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted">
              {locale === 'ar' ? 'موسيقى ليك' : 'YOUR MUSIC'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Link
          prefetch={false}
          href={`/${locale}/search`}
          className="rounded-full p-2.5 text-muted transition hover:bg-white/10 hover:text-ink"
          aria-label={t('nav.search')}
        >
          <OddioGlyph name="search" size={21} className="oddio-glyph" />
        </Link>
        {currentUser ? (
          <>
            <Link
              prefetch={false}
              href={`/${locale}/notifications`}
              className="rounded-full p-2.5 text-muted transition hover:bg-white/10 hover:text-ink"
              aria-label={t('nav.notifications')}
            >
              <OddioGlyph name="notifications" size={21} className="oddio-glyph" />
            </Link>
            <Link
              prefetch={false}
              href={`/${locale}/settings`}
              aria-label={t('nav.settings')}
            >
              <Avatar name={currentUser.displayName} className="h-8 w-8" />
            </Link>
          </>
        ) : (
          <Link
            prefetch={false}
            href={`/${locale}/login`}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#eab99770] bg-[#f1f1f1] px-4 py-2 text-xs font-bold text-[#101010] transition hover:bg-[#dedede] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eab997]"
          >
            <LogIn className="h-4 w-4" />
            {t('nav.login')}
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
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const items = [
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
        className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(72px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-white/10 bg-[#151515]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl lg:hidden"
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
                'group/mnav relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition',
                active ? 'text-primary' : 'text-muted hover:text-ink',
              )}
            >
              {active ? (
                <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-[#f1f1f1]" />
              ) : null}
              <OddioGlyph name={glyph} size={22} className="oddio-glyph" />
              {item.label}
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
            'flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition',
            menuOpen ? 'text-[#eab997]' : 'text-muted hover:text-ink',
          )}
        >
          <Menu className="h-5 w-5" />
          {locale === 'ar' ? 'القائمة' : 'Menu'}
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
            role="dialog"
            aria-modal="true"
            aria-label={locale === 'ar' ? 'القائمة' : 'Menu'}
            className="absolute inset-y-0 left-0 flex w-[min(88vw,360px)] flex-col overflow-y-auto border-r border-[#604b83]/50 bg-[#101015] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] shadow-[15px_0_80px_rgba(0,0,0,0.65)]"
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
                {
                  href: `/${locale}/discover#artists`,
                  label: locale === 'ar' ? 'الفنانون' : 'Artists',
                  icon: Mic2,
                },
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
                ...(user?.isArtistManager
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
