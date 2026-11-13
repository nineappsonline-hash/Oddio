'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowUpRight,
  Sparkles,
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
import { cn } from '@/lib/utils';

export function Logo({ locale, compact = false }: { locale: string; compact?: boolean }) {
  return (
    <Link
      prefetch={false}
      href={`/${locale}`}
      className="group/logo inline-flex items-center gap-3"
      aria-label="Oddio"
    >
      <span className="relative flex h-12 w-12 shrink-0">
        <Image
          src="/oddio-logo-hq.png"
          alt="Oddio"
          width={48}
          height={48}
          className="h-full w-full object-contain"
          priority
        />
      </span>
      {!compact ? (
        <span className="leading-tight">
          <span className="block text-sm font-black uppercase tracking-[0.18em] text-ink">
            Oddio
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
    {
      href: `/${locale}/soundspace`,
      label: locale === 'ar' ? 'مساحتك الموسيقية' : 'Soundspace',
      icon: Sparkles,
    },
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
    <aside className="fixed inset-y-0 start-0 z-40 hidden w-[244px] flex-col overflow-hidden border-e border-[#eab99719] bg-[#130f13] px-4 py-5 lg:flex">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 start-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl"
      />
      <div className="relative mb-9 px-2">
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
              prefetch={false}
              key={item.href}
              href={item.href}
              className={cn(
                'group/nav relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition duration-300',
                active
                  ? 'bg-[#753f4a]/30 text-[#f8e7da]'
                  : 'text-[#b6a5a1] hover:bg-[#ffffff0c] hover:text-[#f5ede8]',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {active ? (
                <span className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-[#eab997]" />
              ) : null}
              <Icon
                className={cn(
                  'h-5 w-5 transition duration-300 group-hover/nav:scale-110',
                  active ? 'text-[#efb994]' : '',
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <section className="mt-4 border-t border-[#eab99718] pt-5" aria-label={locale === 'ar' ? 'مجموعة الموسيقى' : 'Your collection'}>
        <div className="mb-3 flex items-center justify-between px-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#98858b]">{locale === 'ar' ? 'مجموعتك' : 'YOUR COLLECTION'}</p>
          <Library size={14} className="text-[#b28a87]" aria-hidden="true"/>
        </div>
        {[
          { label: locale === 'ar' ? 'الأغاني المفضلة' : 'Liked songs', href: `/${locale}/library`, symbol: '♥', color: '#673547' },
          { label: locale === 'ar' ? 'على حسب مودك' : 'Made for your mood', href: `/${locale}/soundspace`, symbol: '♫', color: '#563a4c' },
          { label: locale === 'ar' ? 'آخر الإصدارات' : 'New releases', href: `/${locale}/discover?sort=newest`, symbol: '✦', color: '#6a443c' },
        ].map((item) => (
          <Link key={item.href} href={item.href} prefetch={false} className="group flex items-center gap-3 rounded-xl px-2 py-2 text-xs font-semibold text-[#c5b4b0] transition hover:bg-white/5 hover:text-white">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg text-[#f5c9a8]" style={{ backgroundColor: item.color }}>{item.symbol}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </section>

      {!currentUser?.isArtistManager ? (
        <Link
          prefetch={false}
          href={`/${locale}/apply/artist`}
          className="group/artist relative mt-4 flex items-center gap-3 overflow-hidden rounded-2xl border border-[#eab99740] bg-gradient-to-r from-[#57303d] to-[#2d1d28] px-3 py-3.5 text-[#f8e8df] transition duration-300 hover:-translate-y-0.5 hover:border-[#eab99780] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eab997]"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover/artist:translate-x-full"
          />
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eab9971c] ring-1 ring-[#eab99740]">
            <Mic2 className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block text-[10px] font-black uppercase tracking-[0.14em] opacity-75">
              <Sparkles className="me-1 inline h-3 w-3" />
              {locale === 'ar' ? 'ابدأ مشوارك' : 'YOUR STAGE AWAITS'}
            </span>
            <span className="block text-sm font-black leading-5">
              {locale === 'ar' ? 'كن فنانًا' : 'Become an Artist'}
            </span>
          </span>
          <ArrowUpRight className="relative h-5 w-5 shrink-0 transition-transform group-hover/artist:-translate-y-0.5 group-hover/artist:translate-x-0.5" />
        </Link>
      ) : null}

      <div className="mt-4 space-y-1 border-t border-white/10 pt-4">
        <Link
          prefetch={false}
          href={`/${locale}/notifications`}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-ink"
        >
          <LayoutDashboard className="h-4 w-4" />
          {t('nav.notifications')}
        </Link>
        <Link
          prefetch={false}
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
              prefetch={false}
              href={`/${locale}/login`}
              className="block rounded-xl bg-[#eab997] px-3 py-2 text-center text-sm font-semibold text-[#25171d] transition hover:bg-primary-strong"
            >
              {t('nav.login')}
            </Link>
            <Link
              prefetch={false}
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
