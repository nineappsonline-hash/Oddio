import { notFound, redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { ArtistSearchAliases } from '@/components/studio/ArtistSearchAliases';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { PageHeader } from '@/components/ui/PageHeader';
import { ArtistProfileForm } from '@/components/studio/StudioForms';

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
    title: t('studio.editArtist'),
    description: t('studio.subtitle'),
    path: '/studio/artists/edit',
    noindex: true,
  });
}

export default async function EditArtistPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const t = createTranslator(locale);
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  if (!user.isArtistManager) redirect(`/${locale}/apply/artist`);
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const artist = db.artists.find(
    (item) => item.id === id && item.ownerUserId === user.id,
  );
  if (!artist) notFound();

  return (
    <div>
      <PageHeader title={t('studio.editArtist')} subtitle={artist.name} />
      <ArtistProfileForm locale={locale} artist={artist} />
      <ArtistSearchAliases artistId={artist.id} initial={artist.searchAliases ?? []} locale={locale} />
    </div>
  );
}
