import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { getStudioData } from '@/lib/data/queries';
import { env } from '@/lib/env';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { VerificationButton } from '@/components/studio/StudioTrackActions';

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
    title: t('studio.verification'),
    description: t('studio.verificationBody'),
    path: '/studio/verification',
    noindex: true,
  });
}

export default async function StudioVerificationPage({
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
  const data = getStudioData(readDb(), user, { demoDailyLimit: env.uploadDailyLimit });

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm text-muted">{t('studio.verificationBody')}</p>
      {data.artists.length === 0 ? (
        <EmptyState title={t('studio.noArtists')} />
      ) : (
        <div className="card divide-y divide-white/5">
          {data.artists.map((artist) => {
            const request = data.verificationRequests.find(
              (item) => item.artistId === artist.id,
            );
            const approved = artist.verificationStatus === 'approved';
            const pending = request?.status === 'pending';
            return (
              <div
                key={artist.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{artist.name}</p>
                  <p className="text-xs text-muted">{artist.verificationStatus}</p>
                </div>
                {approved ? (
                  <Badge tone="cyan">{t('studio.verificationApproved')}</Badge>
                ) : pending ? (
                  <Badge tone="warning">{t('studio.verificationPending')}</Badge>
                ) : (
                  <VerificationButton artistId={artist.id} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
