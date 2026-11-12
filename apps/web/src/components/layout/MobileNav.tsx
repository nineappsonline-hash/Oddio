'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, Compass, Home, Library, Menu, Search, User, X, Mic2, Settings, LogIn, UserPlus, ArrowUpRight, BarChart3, Shield, Globe2 } from 'lucide-react';
import type { SessionUser } from '@ai-music/contracts';
import { useSession } from '@/components/providers/SessionProvider';
import { Avatar } from '@/components/ui/Artwork';
import { Logo } from '@/components/layout/Sidebar';
import { useT } from '@/i18n/use-translator';
import { useLocalePath } from '@/lib/use-locale-path';
import { Equalizer } from '@/components/visuals/Equalizer';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { cn } from '@/lib/utils';

export function MobileHeader({ user }: { user: SessionUser | null }) {
  const t = useT();
  const { locale } = useLocalePath();
  const session = useSession();
  const currentUser = session.user ?? user;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-background/70 px-4 py-3 backdrop-blur-2xl lg:hidden">
      <div className="flex items-center gap-2.5">
        <Logo locale={locale} compact />
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-ink">
            AI Music
          </p>
          <div className="flex items-center gap-1.5">
            <Equalizer bars={3} className="h-2.5 text-primary" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted">
              {t('player.live')}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={locale === 'ar' ? 'افتح القائمة' : 'Open menu'} onClick={() => document.getElementById('oddio-mobile-menu-trigger')?.click()} className="flex h-10 w-10 items-center justify-center rounded-xl border border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-200 transition hover:bg-fuchsia-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-fuchsia-300"><Menu className="h-5 w-5" /></button>
        <Link
          href={`/${locale}/search`}
          className="rounded-full p-2.5 text-muted transition hover:bg-white/10 hover:text-ink"
          aria-label={t('nav.search')}
        >
          <Search className="h-5 w-5" />
        </Link>
        {currentUser ? (
          <>
            <Link
              href={`/${locale}/notifications`}
              className="rounded-full p-2.5 text-muted transition hover:bg-white/10 hover:text-ink"
              aria-label={t('nav.notifications')}
            >
              <Bell className="h-5 w-5" />
            </Link>
            <Link href={`/${locale}/settings`} aria-label={t('nav.settings')}>
              <Avatar name={currentUser.displayName} className="h-8 w-8" />
            </Link>
          </>
        ) : (
          <Link
            href={`/${locale}/login`}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-fuchsia-300/40 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 px-4 py-2 text-xs font-bold text-white shadow-[0_5px_22px_rgba(192,38,211,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(192,38,211,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300"
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
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const items = [
    { href: `/${locale}`, label: t('nav.home'), icon: Home, exact: true },
    { href: `/${locale}/discover`, label: t('nav.discover'), icon: Compass },
    { href: `/${locale}/search`, label: t('nav.search'), icon: Search },
    user
      ? {
          href: `/${locale}/library`,
          label: t('nav.library'),
          icon: Library,
          exact: false,
        }
      : {
          href: `/${locale}/charts`,
          label: t('nav.charts'),
          icon: Library,
          exact: false,
        },

  ];

  return (
    <>
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-[#0b0b16]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl lg:hidden"
    >
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group/mnav relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition',
              active ? 'text-primary' : 'text-muted hover:text-ink',
            )}
          >
            {active ? (
              <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-gradient-to-r from-primary via-cyan to-coral shadow-glow" />
            ) : null}
            <Icon
              className={cn(
                'h-5 w-5 transition duration-300 group-hover/mnav:-translate-y-0.5',
                active ? 'drop-shadow-[0_0_8px_rgba(157,92,255,0.9)]' : '',
              )}
            />
            {item.label}
          </Link>
        );
      })}
      <button id="oddio-mobile-menu-trigger" type="button" onClick={() => setMenuOpen(true)} aria-label={locale === 'ar' ? 'القائمة' : 'Menu'} aria-expanded={menuOpen}
        className={cn('flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition', menuOpen ? 'text-fuchsia-300' : 'text-muted hover:text-ink')}>
        <Menu className="h-5 w-5" />{locale === 'ar' ? 'القائمة' : 'Menu'}
      </button>
    </nav>
    {menuOpen ? (
      <div className="fixed inset-0 z-[70] lg:hidden" role="presentation">
        <button type="button" className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-label={locale === 'ar' ? 'إغلاق القائمة' : 'Close menu'} onClick={() => setMenuOpen(false)} />
        <section role="dialog" aria-modal="true" aria-label={locale === 'ar' ? 'القائمة' : 'Menu'} className="absolute inset-y-0 start-0 flex w-[min(88vw,360px)] flex-col overflow-y-auto border-e border-fuchsia-400/20 bg-[#151126] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] shadow-[15px_0_80px_rgba(0,0,0,0.65)]">
          <div className="mb-5 flex items-center justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-fuchsia-300">ODDIO</p><h2 className="text-xl font-black text-white">{locale === 'ar' ? 'القائمة الرئيسية' : 'Main Menu'}</h2></div>
            <button type="button" onClick={() => setMenuOpen(false)} aria-label={locale === 'ar' ? 'إغلاق' : 'Close'} className="rounded-xl border border-white/10 bg-white/10 p-2 text-white"><X className="h-5 w-5" /></button>
          </div>
          {!user?.isArtistManager ? (
            <Link href={`/${locale}/apply/artist`} onClick={() => setMenuOpen(false)} className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-400 via-rose-400 to-fuchsia-500 px-4 py-4 font-black text-[#241029] shadow-[0_8px_30px_rgba(244,114,182,0.25)]">
              <Mic2 className="h-6 w-6" /><span className="flex-1">{locale === 'ar' ? 'كن فنانًا' : 'Become an Artist'}</span><ArrowUpRight className="h-5 w-5" />
            </Link>
          ) : null}
          <div className="grid gap-2">
            {[
              { href: `/${locale}`, label: t('nav.home'), icon: Home },
              { href: `/${locale}/discover`, label: t('nav.discover'), icon: Compass },
              { href: `/${locale}/charts`, label: t('nav.charts'), icon: BarChart3 },
              { href: `/${locale}/search`, label: t('nav.search'), icon: Search },
              ...(user ? [{ href: `/${locale}/library`, label: t('nav.library'), icon: Library }, { href: `/${locale}/notifications`, label: t('nav.notifications'), icon: Bell }, { href: `/${locale}/settings`, label: t('nav.settings'), icon: Settings }] : []),
              ...(user?.isArtistManager ? [{ href: `/${locale}/studio`, label: t('nav.studio'), icon: Mic2 }] : []),
              ...(user && user.roles.length > 0 ? [{ href: `/${locale}/admin`, label: t('nav.admin'), icon: Shield }] : []),
              ...(!user ? [{ href: `/${locale}/signup`, label: locale === 'ar' ? 'إنشاء حساب' : 'Create account', icon: UserPlus }] : []),
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:border-fuchsia-400/40 hover:bg-white/10">
                <Icon className="h-5 w-5 text-fuchsia-300" />{label}
              </Link>
            ))}
          </div>
          <div className="mt-5 border-t border-white/10 pt-4"><LocaleSwitcher /></div>
          {!user ? <Link href={`/${locale}/login`} onClick={() => setMenuOpen(false)} className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-black text-white shadow-lg"><LogIn className="h-4 w-4" />{t('nav.login')}</Link> : null}
        </section>
      </div>
    ) : null}
    </>
  );
}
