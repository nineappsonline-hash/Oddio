import Link from 'next/link';
import type { Playlist } from '@ai-music/contracts';
import { Artwork } from '@/components/ui/Artwork';
import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/utils';

export function PlaylistCard({
  playlist,
  locale,
  accent = '#41D9FF',
}: {
  playlist: Playlist;
  locale: 'en' | 'ar';
  accent?: string;
}) {
  return (
    <Link
      href={`/${locale}/playlists/${playlist.id}-${playlist.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`}
      className="group card card-hover p-3"
    >
      <div className="art-frame relative rounded-xl">
        <Artwork
          title={playlist.title}
          accent={accent}
          className="aspect-square w-full transition duration-700 ease-out group-hover:scale-[1.045]"
          rounded="rounded-xl"
        />
        <span className="art-sheen" />
        {playlist.visibility === 'private' ? (
          <Badge tone="warning" className="absolute start-2 top-2">
            {locale === 'ar' ? 'خاص' : 'Private'}
          </Badge>
        ) : null}
      </div>
      <p className="mt-3 truncate text-sm font-semibold text-ink transition group-hover:text-primary">
        {playlist.title}
      </p>
      <p className="truncate text-xs text-muted">
        {playlist.trackIds.length} {locale === 'ar' ? 'أغاني' : 'tracks'} ·{' '}
        {formatNumber(playlist.followers, locale)}{' '}
        {locale === 'ar' ? 'متابع' : 'followers'}
      </p>
    </Link>
  );
}
