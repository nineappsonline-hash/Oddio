import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getSessionUser } from '@/lib/auth/session';
import { serviceClient } from '@/lib/data/supabase-store';

export const dynamic = 'force-dynamic';

/** Friendly shortcut for an artist's own public podcast profile. */
export default async function MyPodcastProfile({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'en';
  const user = await getSessionUser();
  if (!user)
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/podcasts/me`)}`);
  if (!user.artistIds.length) {
    if (user.isArtistManager) redirect(`/${locale}/studio/artists/new`);
    if (user.roles.some((r) => r === 'admin' || r === 'super_admin'))
      redirect(`/${locale}/podcasts/manage`);
    redirect(`/${locale}/apply/artist`);
  }
  const { data: artists } = await serviceClient()
    .from('artists')
    .select('slug')
    .eq('owner_user_id', user.id)
    .in('id', user.artistIds)
    .limit(1);
  const slug = artists?.[0]?.slug;
  if (!slug)
    redirect(
      user.isArtistManager ? `/${locale}/studio/artists` : `/${locale}/apply/artist`,
    );
  redirect(`/${locale}/podcasts/creators/${encodeURIComponent(slug)}`);
}
