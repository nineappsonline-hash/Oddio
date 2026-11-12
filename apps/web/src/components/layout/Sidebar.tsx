'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  BarChart3,
  Compass,
  Home,
  LayoutDashboard,
  Library,
  Mic2,
  Search,
  Settings,
  Shield,
} from 'lucide-react';
import type { SessionUser } from '@ai-music/contracts';
import { useSession } from '@/components/providers/SessionProvider';
import { Avatar } from '@/components/ui/Artwork';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { useT } from '@/i18n/use-translator';
import { useLocalePath } from '@/lib/use-locale-path';
import { Equalizer } from '@/components/visuals/Equalizer';
import { cn } from '@/lib/utils';

export function Logo({ locale, compact = false }: { locale: string; compact?: boolean }) {
  return (
    <Link
      href={`/${locale}`}
      className="group/logo inline-flex items-center gap-3"
      aria-label="Oddio"
    >
      <span className="relative flex h-12 w-12 shrink-0 overflow-hidden rounded-xl shadow-glow">
        <Image src="/oddio-logo.svg" alt="Oddio" width={48} height={48} className="h-full w-full object-cover" priority />
      </span>
      {!compact ? (
        <span className="leading-tight">
          <span className="block text-sm font-black uppercase tracking-[0.18em] text-ink">
            AI Music
          </span>
          <span className="block text-[9px] font-semibold uppercase tracking-[0.28em] text-primary/80">
            {locale === 'ar' ? 'مختارة بإيد بشر' : 'Human curated'}
          </span>
        </span>
      ) : null}
    </Link>
  );
}

export function Sidebar({ user }: { user: SessionUser | null }) {
  const t = useT();
  const { locale, pathname } = useLocalePath();
  const session = useSession();
  const currentUser = session.user ?? user;

  const items = [
    { href: `/${locale}`, label: t('nav.home'), icon: Home, exact: true },
    { href: `/${locale}/discover`, label: t('nav.discover'), icon: Compass },
    { href: `/${locale}/charts`, label: t('nav.charts'), icon: BarChart3 },
    { href: `/${locale}/search`, label: t('nav.search'), icon: Search },
  ];

  if (currentUser) {
    items.push({
      href: `/${locale}/library`,
      label: t('nav.library'),
      icon: Library,
      exact: false,
    });
  }
  if (currentUser?.isArtistManager) {
    items.push({
      href: `/${locale}/studio`,
      label: t('nav.studio'),
      icon: Mic2,
      exact: false,
    });
  }
  if (currentUser && currentUser.roles.length > 0) {
    items.push({
      href: `/${locale}/admin`,
      label: t('nav.admin'),
      icon: Shield,
      exact: false,
    });
  }

  return (
    <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 flex-col overflow-hidden border-e border-white/10 bg-[#0b0b16]/80 px-4 py-5 backdrop-blur-2xl lg:flex">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 start-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl"
      />
      <div className="relative mb-8 px-2">
        <Logo locale={locale} />
      </div>
      <nav aria-label={t('nav.main')} className="flex-1 space-y-1">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group/nav relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition duration-300',
                active
                  ? 'nav-active-glow bg-primary/15 text-ink'
                  : 'text-muted hover:translate-x-0.5 hover:bg-white/5 hover:text-ink',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {active ? (
                <span className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-gradient-to-b from-primary via-cyan to-coral shadow-glow" />
              ) : null}
              <Icon
                className={cn(
                  'h-5 w-5 transition duration-300 group-hover/nav:scale-110',
                  active ? 'text-primary drop-shadow-[0_0_8px_rgba(157,92,255,0.8)]' : '',
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-primary/15 via-white/[0.03] to-cyan/10 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink/80">
            AI Radio
          </span>
          <span className="live-dot" />
        </div>
        <div className="mt-2 flex items-end gap-2">
          <Equalizer bars={7} className="h-6 flex-1 text-primary/80" />
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted">
            24/7
          </span>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-muted">
          {t('app.shortTagline')}
        </p>
      </div>

      <div className="mt-4 space-y-1 border-t border-white/10 pt-4">
        <Link
          href={`/${locale}/notifications`}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-ink"
        >
          <LayoutDashboard className="h-4 w-4" />
          {t('nav.notifications')}
        </Link>
        <Link
          href={`/${locale}/settings`}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-ink"
        >
          <Settings className="h-4 w-4" />
          {t('nav.settings')}
        </Link>
        <LocaleSwitcher />
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        {currentUser ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 px-1">
              <Avatar name={currentUser.displayName} className="h-9 w-9" />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink">
                  {currentUser.displayName}
                </p>
                <p className="truncate text-[11px] text-muted">@{currentUser.handle}</p>
              </div>
            </div>
            <LogoutButton />
          </div>
        ) : (
          <div className="space-y-2">
            <Link
              href={`/${locale}/login`}
              className="block rounded-xl bg-primary px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-primary-strong"
            >
              {t('nav.login')}
            </Link>
            <Link
              href={`/${locale}/signup`}
              className="block rounded-xl border border-white/15 px-3 py-2 text-center text-sm font-semibold text-ink transition hover:bg-white/5"
            >
              {t('nav.signup')}
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
