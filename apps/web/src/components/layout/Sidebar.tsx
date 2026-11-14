'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowUpRight,
  Sparkles,
  LayoutDashboard,
  Library,
  Mic2,
  Settings,
} from 'lucide-react';
import type { SessionUser } from '@ai-music/contracts';
import { useSession } from '@/components/providers/SessionProvider';
import { Avatar } from '@/components/ui/Artwork';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { useT } from '@/i18n/use-translator';
import { useLocalePath } from '@/lib/use-locale-path';
import { cn } from '@/lib/utils';
import { OddioGlyph, type OddioGlyphName } from '@/components/ui/OddioGlyph';

export function Logo({ locale, compact = false }: { locale: string; compact?: boolean }) {
  return (
    <Link
      prefetch={false}
      href={`/${locale}`}
      className="group/logo inline-flex items-center gap-3"
      aria-label="Oddio"
    >
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
        <Image src="/oddio-gradient-play-logo.png" alt="Oddio" width={48} height={48} className="h-full w-full object-contain" priority />
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
    { href: `/${locale}`, label: t('nav.home'), icon: 'home', exact: true },
    { href: `/${locale}/discover`, label: t('nav.discover'), icon: 'discover' },
    {
      href: `/${locale}/soundspace`,
      label: locale === 'ar' ? 'مساحتك الموسيقية' : 'Soundspace',
      icon: 'soundspace',
    },
    { href: `/${locale}/charts`, label: t('nav.charts'), icon: 'charts' },
    { href: `/${locale}/search`, label: t('nav.search'), icon: 'search' },
  ];

  if (currentUser) {
    items.push({
      href: `/${locale}/library`,
      label: t('nav.library'),
      icon: 'library',
      exact: false,
    });
  }
  if (currentUser?.isArtistManager) {
    items.push({
      href: `/${locale}/studio`,
      label: t('nav.studio'),
      icon: 'studio',
      exact: false,
    });
  }
  if (currentUser && currentUser.roles.length > 0) {
    items.push({
      href: `/${locale}/admin`,
      label: t('nav.admin'),
      icon: 'admin',
      exact: false,
    });
  }

  return (
    <aside className="fixed inset-y-0 start-0 z-40 hidden w-[244px] flex-col overflow-y-auto overflow-x-hidden border-e border-[#343434] bg-[#101010] px-4 py-5 lg:flex">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 start-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl"
      />
      <div className="relative mb-7 shrink-0 px-2">
        <Logo locale={locale} />
      </div>
      <nav aria-label={t('nav.main')} className="shrink-0 space-y-1">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const glyph = item.icon as OddioGlyphName;
          return (
            <Link
              prefetch={false}
              key={item.href}
              href={item.href}
              className={cn(
                'group/nav relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition duration-300',
                active
                  ? 'bg-[#272727] text-[#f7f7f7]'
                  : 'text-[#a4a4a4] hover:bg-[#252525] hover:text-white',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {active ? (
                <span className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-[#f1f1f1]" />
              ) : null}
              <span className="oddio-glyph-frame">
                <OddioGlyph name={glyph} size={20} className="oddio-glyph" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <section
        className="mt-4 shrink-0 border-t border-white/10 pt-4"
        aria-label={locale === 'ar' ? 'مجموعة الموسيقى' : 'Your collection'}
      >
        <div className="mb-3 flex items-center justify-between px-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#98858b]">
            {locale === 'ar' ? 'مجموعتك' : 'YOUR COLLECTION'}
          </p>
          <Library size={14} className="text-[#b28a87]" aria-hidden="true" />
        </div>
        {[
          {
            label: locale === 'ar' ? 'الأغاني المفضلة' : 'Liked songs',
            href: `/${locale}/library`,
            symbol: 'liked',
            color: '#303030',
          },
          {
            label: locale === 'ar' ? 'على حسب مودك' : 'Made for your mood',
            href: `/${locale}/soundspace`,
            symbol: 'soundspace',
            color: '#3c3c3c',
          },
          {
            label: locale === 'ar' ? 'آخر الإصدارات' : 'New releases',
            href: `/${locale}/discover?sort=newest`,
            symbol: 'releases',
            color: '#292929',
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className="group flex items-center gap-3 rounded-xl px-2 py-2 text-xs font-semibold text-[#c5b4b0] transition hover:bg-white/5 hover:text-white"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg text-[#f5c9a8]"
              style={{ backgroundColor: item.color }}
            >
              <OddioGlyph
                name={item.symbol as OddioGlyphName}
                size={21}
                className="oddio-glyph"
              />
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </section>

      {!currentUser?.isArtistManager ? (
        <Link
          prefetch={false}
          href={`/${locale}/apply/artist`}
          className="group/artist relative mt-4 flex min-h-[86px] shrink-0 items-center gap-3 overflow-hidden rounded-2xl border border-[#F5D991]/70 bg-gradient-to-br from-[#F8DE98] via-[#E8BF61] to-[#BC8830] px-3 py-3 text-[#211708] shadow-[0_8px_26px_rgba(186,134,39,0.20)] transition duration-300 hover:-translate-y-0.5 hover:from-[#FFE8A9] hover:via-[#F0CC76] hover:to-[#C9973B] hover:shadow-[0_12px_32px_rgba(186,134,39,0.32)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE5A3]"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover/artist:translate-x-full"
          />
          <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#392711]/20 bg-[#342309]/10">
            <OddioGlyph name="studio" size={24} className="oddio-glyph" />
          </span>
          <span className="relative flex min-w-0 flex-1 flex-col justify-center gap-1">
            <span className="block text-[9px] font-extrabold uppercase leading-tight tracking-[0.09em] text-[#65450E]">
              {locale === 'ar' ? 'ابدأ مشوارك' : 'YOUR STAGE AWAITS'}
            </span>
            <span className="block text-[13px] font-black leading-[1.25] text-[#211708]">
              {locale === 'ar' ? 'كن فنانًا' : 'Become an Artist'}
            </span>
          </span>
          <ArrowUpRight className="relative h-[18px] w-[18px] shrink-0 transition-transform group-hover/artist:-translate-y-0.5 group-hover/artist:translate-x-0.5" />
        </Link>
      ) : null}

      <div className="mt-4 shrink-0 space-y-1 border-t border-white/10 pt-4">
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

      <div className="mt-4 shrink-0 border-t border-white/10 pt-4">
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
              className="oddio-login-cta flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-center text-sm font-extrabold transition"
            >
              <OddioGlyph name="account" size={18} className="oddio-glyph" />
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
