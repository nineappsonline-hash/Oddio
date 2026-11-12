import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { Artwork } from '@/components/ui/Artwork';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : 'en';
  const t = createTranslator(safeLocale);
  return buildMetadata({
    locale: safeLocale,
    title: t('studio.artists'),
    description: t('studio.subtitle'),
    path: '/studio/artists',
    noindex: true,
  });
}

export default async function StudioArtistsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const t = createTranslator(locale);
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  if (!user.isArtistManager) redirect(`/${locale}/apply/artist`);
  const db = readDb();
  const artists = db.artists.filter((artist) => artist.ownerUserId === user.id);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ButtonLink href={`/${locale}/studio/artists/new`} size="sm">
          {t('studio.newArtist')}
        </ButtonLink>
      </div>
      {artists.length === 0 ? (
        <EmptyState
          title={t('studio.noArtists')}
          action={
            <ButtonLink href={`/${locale}/studio/artists/new`} size="sm">
              {t('studio.newArtist')}
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {artists.map((artist) => (
            <div key={artist.id} className="card flex items-center gap-4 p-4">
              <Artwork
                title={artist.name}
                url={artist.avatarUrl || artist.coverUrl}
                accent={artist.accent}
                className="h-16 w-16"
                rounded="rounded-full"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{artist.name}</p>
                <p className="truncate text-xs text-muted">/{artist.slug}</p>
                <div className="mt-1 flex gap-2">
                  {artist.verificationStatus === 'approved' ? (
                    <Badge tone="cyan">{t('artist.verified')}</Badge>
                  ) : (
                    <Badge tone="neutral">{artist.verificationStatus}</Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Link
                  href={`/${locale}/studio/artists/${artist.id}`}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {t('common.edit')}
                </Link>
                <Link
                  href={`/artists/${artist.slug}`}
                  className="text-xs text-muted hover:text-ink"
                >
                  {t('common.open')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
