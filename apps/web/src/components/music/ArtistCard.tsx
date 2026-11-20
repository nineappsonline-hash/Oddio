import Link from 'next/link';
import type { Artist } from '@ai-music/contracts';
import { Artwork, Avatar } from '@/components/ui/Artwork';
import { Badge } from '@/components/ui/Badge';
import type { Locale } from '@ai-music/contracts';

export function ArtistCard({
  artist,
  locale,
}: {
  artist: Artist & { trackCount?: number; followerCount?: number };
  locale: Locale;
}) {
  return (
    <Link
      href={`/${locale}/artists/${artist.slug}`}
      className="group card card-hover flex min-w-0 flex-col items-center p-4 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="relative">
        <span
          className="absolute -inset-2 -z-10 rounded-full opacity-0 blur-xl transition duration-500 group-hover:opacity-70"
          style={{ background: artist.accent }}
        />
        <Artwork
          title={artist.name}
          url={artist.avatarUrl || artist.coverUrl}
          accent={artist.accent}
          className="h-24 w-24 transition duration-700 ease-out group-hover:scale-105"
          rounded="rounded-full"
        />
        {artist.verificationStatus === 'approved' ? (
          <span className="absolute -bottom-1 -end-1 rounded-full bg-cyan px-1.5 py-0.5 text-[9px] font-bold uppercase text-background">
            ✓
          </span>
        ) : null}
      </div>
      <p className="mt-3 w-full truncate text-sm font-semibold text-ink transition group-hover:text-primary">
        {artist.name}
      </p>
      <p className="mt-1 text-xs text-muted" dir="auto">
        {artist.trackCount ?? 0} {locale === 'ar' ? 'أغنية' : 'tracks'}
        {' · '}
        {artist.followerCount ?? 0} {locale === 'ar' ? 'متابع' : 'followers'}
      </p>
      {artist.verificationStatus === 'approved' ? (
        <Badge tone="cyan" className="mt-2">
          {locale === 'ar' ? 'موثّق' : 'Verified'}
        </Badge>
      ) : null}
    </Link>
  );
}

export function ArtistListRow({ artist, locale }: { artist: Artist; locale: Locale }) {
  return (
    <Link
      href={`/${locale}/artists/${artist.slug}`}
      className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Avatar name={artist.name} accent={artist.accent} className="h-11 w-11" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{artist.name}</p>
        <p className="truncate text-xs text-muted">
          {artist.verificationStatus === 'approved'
            ? locale === 'ar'
              ? 'فنان موثّق'
              : 'Verified artist'
            : locale === 'ar'
              ? 'فنان'
              : 'Artist'}
        </p>
      </div>
    </Link>
  );
}
