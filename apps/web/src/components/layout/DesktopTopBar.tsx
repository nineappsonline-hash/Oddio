'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Bell, Search, Headphones, UserRound } from 'lucide-react';
import { useLocalePath } from '@/lib/use-locale-path';
import { useSession } from '@/components/providers/SessionProvider';
import { Avatar } from '@/components/ui/Artwork';

/** Consistent desktop workspace header, separate from page content. */
export function DesktopTopBar() {
  const { locale } = useLocalePath();
  const { user } = useSession();
  const router = useRouter();
  const ar = locale === 'ar';
  return (
    <header
      className="oddio-topbar"
      aria-label={ar ? 'شريط أدوات أوديو' : 'Oddio workspace'}
    >
      <div className="oddio-topbar-history">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label={ar ? 'رجوع' : 'Go back'}
        >
          <ArrowLeft size={17} className="rtl:rotate-180" />
        </button>
        <button
          type="button"
          onClick={() => router.forward()}
          aria-label={ar ? 'التالي' : 'Go forward'}
        >
          <ArrowRight size={17} className="rtl:rotate-180" />
        </button>
      </div>
      <form
        className="oddio-topbar-search"
        action={`/${locale}/search`}
        method="GET"
        role="search"
      >
        <Search aria-hidden="true" size={18} />
        <input
          name="q"
          type="search"
          autoComplete="off"
          placeholder={
            ar ? 'دور على أغنية، فنان، أو مود...' : 'Search songs, artists, moods...'
          }
          aria-label={ar ? 'ابحث في الموسيقى' : 'Search music'}
        />
        <kbd aria-hidden="true">↵</kbd>
      </form>
      <div className="oddio-topbar-actions">
        <Link
          prefetch={false}
          href={`/${locale}/soundspace`}
          className="oddio-topbar-discover"
        >
          <Headphones size={17} />
          <span>{ar ? 'مساحتك' : 'My soundspace'}</span>
        </Link>
        {user ? (
          <>
            <Link
              prefetch={false}
              href={`/${locale}/notifications`}
              aria-label={ar ? 'الإشعارات' : 'Notifications'}
              className="oddio-topbar-icon"
            >
              <Bell size={19} />
            </Link>
            <Link
              prefetch={false}
              href={`/${locale}/settings`}
              aria-label={ar ? 'الحساب' : 'Your account'}
            >
              <Avatar name={user.displayName} className="h-9 w-9" />
            </Link>
          </>
        ) : (
          <Link
            prefetch={false}
            href={`/${locale}/login`}
            className="oddio-topbar-account"
          >
            <UserRound size={17} />
            <span>{ar ? 'دخول' : 'Log in'}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
