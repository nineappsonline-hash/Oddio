import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { PlaylistForm } from '@/components/playlists/PlaylistForm';
import { PageHeader } from '@/components/ui/PageHeader';

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
    title: t('playlist.new'),
    description: t('playlist.new'),
    path: '/playlists/new',
    noindex: true,
  });
}

export default async function NewPlaylistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en');
  const locale = raw;
  const t = createTranslator(locale);
  const user = await getSessionUser();
  if (!user)
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/playlists/new`)}`);

  return (
    <div>
      <PageHeader title={t('playlist.new')} subtitle={t('library.subtitle')} />
      <PlaylistForm
        locale={locale}
        labels={{
          title: t('playlist.title'),
          description: t('playlist.description'),
          visibility: t('playlist.visibility'),
          create: t('common.create'),
          public: t('common.public'),
          private: t('common.private'),
          created: t('playlist.created'),
        }}
      />
    </div>
  );
}
