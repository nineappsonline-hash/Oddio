import { notFound } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getMoodPage } from '@/lib/data/queries';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { FlowButton } from '@/components/player/FlowButton';
import { getViewer } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { PageHeader } from '@/components/ui/PageHeader';
import { TrackCard } from '@/components/music/TrackCard';
import { TrackRow } from '@/components/music/TrackRow';
import { EmptyState } from '@/components/ui/EmptyState';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const safeLocale: Locale = isLocale(raw) ? raw : 'en';
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const page = getMoodPage(db, { userId: null, roles: [] }, slug);
  const label = page
    ? safeLocale === 'ar'
      ? page.mood.labelAr
      : page.mood.labelEn
    : slug;
  return buildMetadata({
    locale: safeLocale,
    title: label,
    description: `${label} — ${createTranslator(safeLocale)('app.shortTagline')}`,
    path: `/moods/${slug}`,
  });
}

export default async function MoodPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);
  const viewer = await getViewer();
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const page = getMoodPage(db, viewer, slug);
  if (!page) notFound();
  const label = locale === 'ar' ? page.mood.labelAr : page.mood.labelEn;

  return (
    <div>
      <PageHeader
        eyebrow={t('discover.mood')}
        title={label}
        subtitle={t('discover.results', { count: String(page.tracks.length) })}
      />
      {page.tracks.length > 0 ? (
        <div className="mb-5"><FlowButton kind="mood" seedId={page.mood.id} locale={locale} viewerId={viewer.userId} /></div>
      ) : null}
      {page.tracks.length === 0 ? (
        <EmptyState title={t('discover.empty')} />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {page.tracks.slice(0, 10).map((track) => (
              <TrackCard key={track.id} track={track} queue={page.tracks} />
            ))}
          </div>
          <div className="card divide-y divide-white/5 p-2">
            {page.tracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                queue={page.tracks}
                index={index}
                locale={locale}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
