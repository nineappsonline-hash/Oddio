'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { OddioGlyph } from '@/components/ui/OddioGlyph';
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
        <OddioGlyph name="search" size={20} className="oddio-glyph" />
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
          <OddioGlyph name="soundspace" size={19} className="oddio-glyph" />
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
              <OddioGlyph name="notifications" size={20} className="oddio-glyph" />
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
            <OddioGlyph name="home" size={19} className="oddio-glyph" />
            <span>{ar ? 'دخول' : 'Log in'}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
