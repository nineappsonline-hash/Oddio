'use client';

import Link from 'next/link';
import { Bell, Compass, Home, Library, Menu, Search, User } from 'lucide-react';
import type { SessionUser } from '@ai-music/contracts';
import { useSession } from '@/components/providers/SessionProvider';
import { Avatar } from '@/components/ui/Artwork';
import { Logo } from '@/components/layout/Sidebar';
import { useT } from '@/i18n/use-translator';
import { useLocalePath } from '@/lib/use-locale-path';
import { Equalizer } from '@/components/visuals/Equalizer';
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
            className="rounded-pill bg-primary px-3 py-1.5 text-xs font-semibold text-white"
          >
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
    user
      ? { href: `/${locale}/settings`, label: t('nav.account'), icon: User, exact: false }
      : { href: `/${locale}/login`, label: t('nav.login'), icon: Menu, exact: false },
  ];

  return (
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
    </nav>
  );
}
