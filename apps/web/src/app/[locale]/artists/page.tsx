import '../../oddio-discovery-artists.css';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Artwork } from '@/components/ui/Artwork';
import { readDb } from '@/lib/data/db';
import { loadPageDbFromSupabase } from '@/lib/data/supabase-store';
import { getSitemapEntries } from '@/lib/data/queries';
import { demoMode } from '@/lib/env';
import { buildMetadata } from '@/lib/seo';
import { isLocale } from '@/i18n/config';

export const dynamic = 'force-dynamic';

async function publicArtists() {
  const { artists, tracks } = getSitemapEntries(
    demoMode ? readDb() : await loadPageDbFromSupabase(),
  );
  const counts = new Map<string, number>();
  for (const track of tracks) {
    counts.set(track.artistId, (counts.get(track.artistId) ?? 0) + 1);
  }
  return artists
    .map((artist) => ({ ...artist, trackCount: counts.get(artist.id) ?? 0 }))
    .sort((a, b) => b.trackCount - a.trackCount || a.name.localeCompare(b.name));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ar = locale === 'ar';
  return buildMetadata({
    locale,
    path: '/artists',
    title: ar ? 'فنانو الموسيقى بالذكاء الاصطناعي' : 'AI Music Artists',
    description: ar
      ? 'اكتشف الفنانين على Oddio واستمع لإصداراتهم الموسيقية الأصلية بالذكاء الاصطناعي. افتح صفحة كل فنان لتسمع أغانيه وتتعرف عليه.'
      : 'Discover artists on Oddio, play their original AI music, and explore the releases on each artist profile.',
    noindex: (await publicArtists()).length === 0,
  });
}

export default async function ArtistsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ar = locale === 'ar';
  const artists = await publicArtists();
  const number = new Intl.NumberFormat(ar ? 'ar-EG' : 'en');
  return (
    <section className="oddio-v2-artists mx-auto max-w-6xl space-y-7 pb-12">
      <header className="oddio-v2-artists-hero rounded-3xl p-6 sm:p-9">
        <p className="oddio-v2-artists-kicker text-xs font-bold uppercase tracking-widest">
          Oddio / {ar ? 'الفنانون' : 'Artists'}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-5xl">
          {ar ? 'فنانو الموسيقى بالذكاء الاصطناعي' : 'Discover AI music artists'}
        </h1>
        <p className="oddio-v2-artists-description mt-3 max-w-2xl text-sm leading-7 sm:text-base">
          {ar
            ? 'اتعرّف على الفنانين اللي بينشروا موسيقى أصلية على Oddio، واستمع لأغانيهم من صفحة كل فنان. لو بتدور على صوت معيّن، ابدأ من أنواع الموسيقى.'
            : 'Meet the artists publishing original AI music on Oddio. Open an artist profile to play their releases, or browse by genre to find a sound you like.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
          <Link
            className="oddio-v2-artists-link"
            prefetch={false}
            href={`/${locale}/genres`}
          >
            {ar ? 'تصفّح أنواع الموسيقى' : 'Browse music genres'}
          </Link>
          <Link
            className="oddio-v2-artists-link"
            prefetch={false}
            href={`/${locale}/discover`}
          >
            {ar ? 'اكتشف أحدث الإصدارات' : 'Discover new releases'}
          </Link>
        </div>
      </header>
      {artists.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {artists.map((artist) => (
            <li key={artist.id}>
              <Link
                prefetch={false}
                href={`/${locale}/artists/${artist.slug}`}
                className="oddio-v2-artist-card flex h-full items-center gap-4 rounded-2xl p-4"
              >
                <Artwork
                  title={artist.name}
                  url={artist.avatarUrl}
                  className="h-14 w-14 shrink-0"
                  sizes="56px"
                />
                <div className="min-w-0">
                  <h2 dir="auto" className="break-words font-bold text-white">
                    {artist.name}
                  </h2>
                  {artist.bio ? (
                    <p dir="auto" className="mt-1 line-clamp-2 text-sm text-white/70">
                      {artist.bio}
                    </p>
                  ) : null}
                  <p className="oddio-v2-artist-count mt-1 text-xs">
                    {ar
                      ? `الأغاني المتاحة: ${number.format(artist.trackCount)}`
                      : `${number.format(artist.trackCount)} ${artist.trackCount === 1 ? 'track' : 'tracks'}`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/75">
          {ar ? 'لسه مفيش إصدارات متاحة هنا.' : 'No public releases are listed yet.'}
        </p>
      )}
    </section>
  );
}
