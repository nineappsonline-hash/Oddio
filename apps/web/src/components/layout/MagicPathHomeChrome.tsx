'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowUpLeft,
  AudioLines,
  Bell,
  ChevronLeft,
  ChevronRight,
  Compass,
  Disc3,
  Headphones,
  Heart,
  Home,
  Library,
  ListMusic,
  Menu,
  Mic2,
  Pause,
  Play,
  Repeat2,
  Search,
  Settings,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import type { SessionUser } from '@ai-music/contracts';
import { Artwork } from '@/components/ui/Artwork';
import { Logo } from '@/components/layout/BrandLogo';
import { usePlayer } from '@/lib/player-store';
import { PlayerSeekProgress } from '@/components/player/PlayerProgress';
import { PlayerVolumeControl } from '@/components/player/PlayerVolumeControl';
import { ExperienceSwitcher } from '@/components/layout/ExperienceSwitcher';
import type { ContentLanguagePreference } from '@/lib/content-language';

type ChromeProps = {
  locale: 'ar' | 'en';
  user: SessionUser | null;
};

const navItems = [
  { path: '', labelAr: 'الرئيسية', labelEn: 'Home', icon: Home },
  { path: '/search', labelAr: 'بحث', labelEn: 'Search', icon: Search },
  { path: '/discover', labelAr: 'اكتشف', labelEn: 'Discover', icon: Compass },
  { path: '/library', labelAr: 'مكتبتي', labelEn: 'Your library', icon: Library },
  { path: '/podcasts', labelAr: 'البودكاست', labelEn: 'Podcasts', icon: Mic2 },
  { path: '/artists', labelAr: 'الفنانون', labelEn: 'Artists', icon: Users },
];

export function MagicPathHomeSidebar({ locale, user }: ChromeProps) {
  const [open, setOpen] = useState(false);
  const ar = locale === 'ar';
  const pathname = usePathname();
  const drawerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),[tabindex="0"]',
        ) ?? [],
      );
    focusable()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = focusable();
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        id="oddio-mobile-menu-trigger"
        ref={triggerRef}
        className="mp2-mobile-menu-trigger"
        aria-expanded={open}
        aria-controls="oddio-magicpath-mobile-menu"
        aria-label={ar ? 'افتح القائمة' : 'Open menu'}
        onClick={() => setOpen(true)}
      >
        <Menu size={21} />
      </button>
      {open ? (
        <button
          className="mp2-drawer-shade"
          type="button"
          aria-label={ar ? 'أغلق القائمة' : 'Close navigation'}
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        ref={drawerRef}
        id="oddio-magicpath-mobile-menu"
        role={open ? 'dialog' : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? (ar ? 'القائمة' : 'Menu') : undefined}
        className={`mp2-sidebar ${open ? 'mp2-sidebar-open' : ''}`}
      >
        <div className="mp2-sidebar-brand">
          <Logo locale={locale} />
          <button
            type="button"
            className="mp2-drawer-close"
            aria-label={ar ? 'أغلق القائمة' : 'Close navigation'}
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p className="mp2-sidebar-heading">
          {ar ? 'استكشف عالمك' : 'EXPLORE YOUR WORLD'}
        </p>
        <nav aria-label={ar ? 'التنقل الرئيسي' : 'Main navigation'}>
          {navItems.map(({ path, labelAr, labelEn, icon: Icon }) => (
            <Link
              key={path}
              href={`/${locale}${path}`}
              aria-current={
                pathname === `/${locale}${path}` || (!path && pathname === `/${locale}/`)
                  ? 'page'
                  : undefined
              }
              className={`mp2-nav-item ${pathname === `/${locale}${path}` || (!path && pathname === `/${locale}/`) ? 'mp2-nav-active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{ar ? labelAr : labelEn}</span>
            </Link>
          ))}
        </nav>
        <div className="mp2-sidebar-divider" />
        <p className="mp2-sidebar-heading">
          {ar ? 'مكتبتك الموسيقية' : 'YOUR COLLECTION'}
        </p>
        <nav aria-label={ar ? 'مجموعتك' : 'Your collection'}>
          <Link
            href={`/${locale}/library`}
            onClick={() => setOpen(false)}
            className="mp2-nav-item"
          >
            <Heart size={18} /> {ar ? 'الأغاني المفضلة' : 'Liked songs'}
          </Link>
          <Link
            href={`/${locale}/soundspace`}
            onClick={() => setOpen(false)}
            className="mp2-nav-item"
          >
            <AudioLines size={18} /> {ar ? 'موسيقى على مزاجك' : 'Made for your mood'}
          </Link>
          <Link
            href={`/${locale}/genres`}
            onClick={() => setOpen(false)}
            className="mp2-nav-item"
          >
            <Disc3 size={18} /> {ar ? 'الأنواع الموسيقية' : 'Music genres'}
          </Link>
          <Link
            href={`/${locale}/charts`}
            onClick={() => setOpen(false)}
            className="mp2-nav-item"
          >
            <ListMusic size={18} /> {ar ? 'الأكثر استماعًا' : 'Top charts'}
          </Link>
        </nav>
        <Link href={`/${locale}/apply/artist`} className="mp2-artist-cta">
          <Sparkles size={23} aria-hidden="true" />
          <span>
            <strong>{ar ? 'عالم جديد مستني صوتك' : 'Your sound belongs here'}</strong>
            <small>{ar ? 'ابدأ مشوارك كفنان' : 'Become an Oddio artist'}</small>
          </span>
          <ArrowUpLeft size={18} aria-hidden="true" />
        </Link>
        <div className="mp2-sidebar-footer">
          <Link href={`/${locale}/notifications`}>
            <Bell size={17} /> {ar ? 'الإشعارات' : 'Notifications'}
          </Link>
          <Link href={`/${locale}/settings`}>
            <Settings size={17} /> {ar ? 'الإعدادات' : 'Settings'}
          </Link>
          {!user ? (
            <Link href={`/${locale}/login`}>{ar ? 'تسجيل الدخول' : 'Log in'}</Link>
          ) : null}
        </div>
      </aside>
    </>
  );
}

export function MagicPathHomeHeader({
  locale,
  user,
  contentLanguage,
}: ChromeProps & { contentLanguage: ContentLanguagePreference }) {
  const router = useRouter();
  const ar = locale === 'ar';
  return (
    <header className="mp2-header">
      <div className="mp2-header-nav">
        <div className="mp2-header-history">
          <button
            onClick={() => router.back()}
            aria-label={ar ? 'رجوع' : 'Back'}
            type="button"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => router.forward()}
            aria-label={ar ? 'التالي' : 'Forward'}
            type="button"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
        <form
          className="mp2-search"
          action={`/${locale}/search`}
          method="get"
          role="search"
        >
          <Search size={18} aria-hidden="true" />
          <input
            name="q"
            type="search"
            aria-label={ar ? 'ابحث في أوديو' : 'Search Oddio'}
            placeholder={
              ar
                ? 'ابحث عن أغنية، فنان، أو بودكاست...'
                : 'Search songs, artists, podcasts...'
            }
          />
          <kbd aria-hidden="true">↵</kbd>
        </form>
      </div>
      <div className="mp2-header-actions">
        <ExperienceSwitcher contentLanguage={contentLanguage} />
        <Link
          href={`/${locale}/notifications`}
          aria-label={ar ? 'الإشعارات' : 'Notifications'}
          className="mp2-header-bell"
        >
          <Bell size={18} />
        </Link>
        <Link
          className="mp2-header-account"
          href={user ? `/${locale}/settings` : `/${locale}/login`}
        >
          {user ? user.displayName.slice(0, 1) : ar ? 'دخول' : 'Log in'}
        </Link>
      </div>
    </header>
  );
}

export function MagicPathHomeListeningRail({ locale }: { locale: 'ar' | 'en' }) {
  const ar = locale === 'ar';
  const track = usePlayer((s) => s.track);
  const queue = usePlayer((s) => s.queue);
  const jumpTo = usePlayer((s) => s.jumpTo);
  const setExpanded = usePlayer((s) => s.setExpanded);
  return (
    <aside className="mp2-listening" aria-label={ar ? 'شغّال دلوقتي' : 'Now playing'}>
      <h2>
        <AudioLines size={19} />
        {ar ? 'شغّال دلوقتي' : 'NOW PLAYING'}
      </h2>
      {track ? (
        <>
          <button
            className="mp2-listening-cover"
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={ar ? 'فتح المشغل' : 'Open player'}
          >
            <Artwork
              title={track.title}
              url={track.artwork.url}
              accent={track.artwork.accent}
              className="aspect-square w-full"
              rounded="rounded-2xl"
            />
          </button>
          <div className="mp2-listening-meta">
            <span>NOW PLAYING</span>
            <strong dir="auto">{track.title}</strong>
            <small dir="auto">{track.artist?.name}</small>
          </div>
        </>
      ) : (
        <div className="mp2-listening-idle">
          <Headphones size={40} />
          <strong>{ar ? 'الموسيقى مستنياك' : 'Your sound starts here'}</strong>
          <small>
            {ar ? 'شغّل أي أغنية علشان تظهر هنا' : 'Play a track to fill this space'}
          </small>
        </div>
      )}
      <div className="mp2-listening-rule" />
      <div className="mp2-listening-queue-title">
        <strong>{ar ? 'التالي في القائمة' : 'Up next'}</strong>
        <span>{queue.length}</span>
      </div>
      <div className="mp2-listening-queue">
        {queue.length ? (
          queue.slice(0, 5).map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => jumpTo(item.id)}
              className="mp2-queue-item"
            >
              <Artwork
                title={item.title}
                url={item.artwork.url}
                accent={item.artwork.accent}
                className="h-11 w-11 shrink-0"
                rounded="rounded-lg"
              />
              <span className="mp2-queue-label">
                <strong dir="auto">{item.title}</strong>
                <small dir="auto">{item.artist?.name}</small>
              </span>
              <Play size={14} />
            </button>
          ))
        ) : (
          <p className="mp2-queue-empty">
            {ar ? 'الأغاني الجاية هتظهر هنا.' : 'Your upcoming tracks will appear here.'}
          </p>
        )}
      </div>
      <Link className="mp2-listening-discover" href={`/${locale}/discover`}>
        {ar ? 'اكتشف موسيقى جديدة' : 'Discover new music'} <ArrowUpLeft size={15} />
      </Link>
    </aside>
  );
}

export function MagicPathHomeBottomPlayer({ locale }: { locale: 'ar' | 'en' }) {
  const ar = locale === 'ar';
  const track = usePlayer((s) => s.track);
  const playing = usePlayer((s) => s.isPlaying);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const previous = usePlayer((s) => s.previous);
  const shuffle = usePlayer((s) => s.shuffle);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const repeat = usePlayer((s) => s.repeat);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const setExpanded = usePlayer((s) => s.setExpanded);
  const showQueue = () => {
    try {
      window.sessionStorage.setItem('oddio:pending-player-tab', 'queue');
    } catch {}
    setExpanded(true);
  };

  return (
    <section
      className="mp2-player"
      role="region"
      aria-label={ar ? 'مشغل أوديو' : 'Oddio music player'}
    >
      <div className="mp2-player-track">
        {track ? (
          <>
            <button
              type="button"
              className="mp2-player-art"
              aria-label={ar ? 'فتح المشغل الكامل' : 'Expand full player'}
              onClick={() => setExpanded(true)}
            >
              <Artwork
                title={track.title}
                url={track.artwork.url}
                accent={track.artwork.accent}
                className="h-12 w-12"
                rounded="rounded-lg"
              />
            </button>
            <button
              className="mp2-player-track-name"
              type="button"
              aria-label={ar ? 'فتح المشغل الكامل' : 'Expand full player'}
              onClick={() => setExpanded(true)}
            >
              <strong dir="auto">{track.title}</strong>
              <small dir="auto">{track.artist?.name}</small>
            </button>
          </>
        ) : (
          <div className="mp2-player-empty">
            <Headphones size={25} />
            <span>
              {ar ? 'اختار أغنية وابدأ الاستماع' : 'Choose a track to start listening'}
            </span>
          </div>
        )}
      </div>
      <div className="mp2-player-main">
        <div className="mp2-player-controls">
          <button
            type="button"
            aria-label={ar ? 'عشوائي' : 'Shuffle'}
            title={ar ? 'عشوائي' : 'Shuffle'}
            className={shuffle ? 'mp2-active' : ''}
            onClick={toggleShuffle}
          >
            <Shuffle size={17} />
          </button>
          <button
            type="button"
            aria-label={ar ? 'السابق' : 'Previous'}
            onClick={() => previous()}
          >
            <SkipBack size={19} fill="currentColor" />
          </button>
          <button
            type="button"
            className="mp2-main-play"
            onClick={toggle}
            disabled={!track}
            aria-label={playing ? (ar ? 'إيقاف مؤقت' : 'Pause') : ar ? 'تشغيل' : 'Play'}
          >
            {playing ? (
              <Pause size={19} fill="currentColor" />
            ) : (
              <Play size={19} fill="currentColor" />
            )}
          </button>
          <button
            type="button"
            aria-label={ar ? 'التالي' : 'Next'}
            onClick={() => next()}
          >
            <SkipForward size={19} fill="currentColor" />
          </button>
          <button
            type="button"
            aria-label={ar ? 'التكرار' : 'Repeat'}
            title={repeat}
            className={repeat !== 'off' ? 'mp2-active' : ''}
            onClick={cycleRepeat}
          >
            <Repeat2 size={17} />
          </button>
        </div>
        {track ? (
          <PlayerSeekProgress rtl={ar} label={ar ? 'موضع التشغيل' : 'Seek'} />
        ) : (
          <div className="mp2-player-inactive-progress" />
        )}
      </div>
      <div className="mp2-player-extra">
        <button
          type="button"
          onClick={showQueue}
          aria-label={ar ? 'قائمة التشغيل' : 'Queue'}
        >
          <ListMusic size={19} />
        </button>
        <Volume2 size={18} aria-hidden="true" />
        <PlayerVolumeControl rtl={ar} label={ar ? 'مستوى الصوت' : 'Volume'} />
      </div>
    </section>
  );
}
