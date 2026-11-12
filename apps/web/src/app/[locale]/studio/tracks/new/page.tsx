import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getStudioData } from '@/lib/data/queries';
import { env } from '@/lib/env';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { PageHeader } from '@/components/ui/PageHeader';
import { UploadForm } from '@/components/studio/UploadForm';
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
    title: t('studio.upload'),
    description: t('studio.uploadSubtitle'),
    path: '/studio/tracks/new',
    noindex: true,
  });
}

export default async function UploadTrackPage({
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
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const data = getStudioData(db, user, { demoDailyLimit: env.uploadDailyLimit });

  if (data.artists.length === 0) {
    return (
      <EmptyState
        title={t('studio.noArtists')}
        action={
          <ButtonLink href={`/${locale}/studio/artists/new`} size="sm">
            {t('studio.newArtist')}
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader title={t('studio.uploadTrack')} subtitle={t('studio.uploadSubtitle')} />
      <UploadForm
        artists={data.artists}
        albums={data.albums.map((album) => ({
          id: album.id,
          artistId: album.artistId,
          title: album.title,
        }))}
        genres={data.genres}
        moods={data.moods}
        quotaRemaining={data.quota.remaining}
        locale={locale}
        production={!demoMode}
      />
    </div>
  );
}
