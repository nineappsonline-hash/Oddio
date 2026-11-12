import Link from 'next/link';
import { Artwork } from '@/components/ui/Artwork';

export function AlbumCard({
  album,
  artistName,
  artistSlug,
  accent,
}: {
  album: { id: string; title: string; artworkUrl: string; releaseAt: string };
  artistName: string;
  artistSlug?: string;
  accent: string;
}) {
  return (
    <Link
      href={`/albums/${album.id}-${album.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`}
      className="group card card-hover p-3"
    >
      <div className="art-frame relative rounded-xl">
        <Artwork
          title={album.title}
          url={album.artworkUrl}
          accent={accent}
          className="aspect-square w-full transition duration-700 ease-out group-hover:scale-[1.045]"
          rounded="rounded-xl"
        />
        <span className="art-sheen" />
      </div>
      <p className="mt-3 truncate text-sm font-semibold text-ink transition group-hover:text-primary">
        {album.title}
      </p>
      {artistSlug ? (
        <p className="truncate text-xs text-muted group-hover:text-ink">{artistName}</p>
      ) : (
        <p className="truncate text-xs text-muted">{artistName}</p>
      )}
    </Link>
  );
}
