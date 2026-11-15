import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getTrackPage } from '@/lib/data/queries';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getViewer } from '@/lib/auth/session';
import { createTranslator } from '@/i18n/dictionaries';
import { isLocale } from '@/i18n/config';
import { buildMetadata, musicRecordingJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { idFromSegment } from '@/lib/links';
import { Artwork } from '@/components/ui/Artwork';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PlayButton } from '@/components/player/PlayButton';
import { FlowButton } from '@/components/player/FlowButton';
import { LikeButton } from '@/components/community/LikeButton';
import { ShareButton } from '@/components/community/ShareButton';
import { ReportButton } from '@/components/community/ReportButton';
import { CommentSection } from '@/components/community/CommentSection';
import { AddToPlaylistButton } from '@/components/playlists/AddToPlaylistButton';
import { TrackCard } from '@/components/music/TrackCard';
import { formatDate, formatDuration, formatNumber } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const safeLocale: Locale = isLocale(raw) ? raw : 'en';
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const page = getTrackPage(db, { userId: null, roles: [] }, idFromSegment(id));
  if (!page)
    return buildMetadata({
      locale: safeLocale,
      title: id,
      description: '',
      noindex: true,
    });
  return buildMetadata({
    locale: safeLocale,
    title: safeLocale === 'ar'
      ? `اسمع ${page.track.title} — ${page.track.artist?.name ?? 'Oddio'}`
      : `${page.track.title} by ${page.track.artist?.name ?? 'Oddio'} — AI Song`,
    description: page.track.description
      ? `${page.track.description.slice(0, 135)} — Listen on Oddio.`
      : safeLocale === 'ar'
        ? `اسمع أغنية ${page.track.title} للفنان ${page.track.artist?.name ?? 'Oddio'} على Oddio. اكتشف موسيقى بالذكاء الاصطناعي وأغاني مشابهة.`
        : `Listen to ${page.track.title} by ${page.track.artist?.name ?? 'Oddio'} on Oddio. Discover original AI-generated music and related songs.`,
    path: `/tracks/${page.track.id}-${page.track.slug}`,
    type: 'music.song',
  });
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);
  const viewer = await getViewer();
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const page = getTrackPage(db, viewer, idFromSegment(id));
  if (!page) notFound();
  const { track, comments, related } = page;
  const artist = track.artist;
  const genreLabel = track.genre
    ? locale === 'ar'
      ? track.genre.labelAr
      : track.genre.labelEn
    : '';
  const metadata = [
    { label: t('track.genre'), value: genreLabel },
    {
      label: t('track.language'),
      value: track.languageCode.toUpperCase(),
    },
    { label: t('track.country'), value: track.countryCode },
    { label: t('track.released'), value: formatDate(track.releaseAt, locale) },
    ...(track.durationMs > 0
      ? [{ label: t('track.duration'), value: formatDuration(track.durationMs) }]
      : []),
    { label: t('track.quality'), value: track.qualityLabel },
    ...(track.audioFeatures?.tempoBpm && track.audioFeatures.tempoConfidence >= 0.5
      ? [
          {
            label: locale === 'ar' ? 'الإيقاع التقريبي' : 'Estimated tempo',
            value: `${track.audioFeatures.tempoBpm} BPM`,
          },
        ]
      : []),
  ].filter((item) => item.value);

  return (
    <div>
      <JsonLd
        data={musicRecordingJsonLd({
          title: track.title,
          artistName: artist?.name ?? '',
          url: `/${locale}/tracks/${track.id}-${track.slug}`,
          durationMs: track.durationMs,
          releaseAt: track.releaseAt,
          genre: genreLabel,
          languageCode: track.languageCode,
        })}
      />

      <section className="mb-10 grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
        <Artwork
          title={track.title}
          url={track.artwork.url}
          accent={track.artwork.accent}
          className="h-56 w-56 sm:h-64 sm:w-64"
          rounded="rounded-3xl"
        />
        <div className="flex flex-col justify-end">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone={track.productionType === 'fully_ai' ? 'primary' : 'cyan'}>
              {track.productionType === 'fully_ai'
                ? t('track.fullyAi')
                : t('track.aiAssisted')}
            </Badge>
            {track.visibility === 'unlisted' ? (
              <Badge tone="warning">{t('common.unlisted')}</Badge>
            ) : null}
            {track.explicit ? <Badge tone="danger">Explicit</Badge> : null}
            {track.genre ? (
              <Link
                href={`/${locale}/genres/${track.genre.slug}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                {genreLabel}
              </Link>
            ) : null}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">
            {track.title}
          </h1>
          {artist ? (
            <Link
              href={`/${locale}/artists/${artist.slug}`}
              className="mt-2 w-fit text-base font-semibold text-muted hover:text-ink"
            >
              {artist.name}
            </Link>
          ) : null}
          <p className="mt-2 text-xs text-muted">
            {formatNumber(track.qualifiedPlays, locale)} {t('common.plays')} ·{' '}
            {formatNumber(track.likeCount, locale)} {t('common.like')} ·{' '}
            {formatDate(track.releaseAt, locale)}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <PlayButton track={track} queue={[track, ...related]} size="lg" />
            <FlowButton
              kind="song"
              seedId={track.id}
              locale={locale}
              viewerId={viewer.userId}
            />
            <LikeButton
              trackId={track.id}
              initialLiked={track.isLiked}
              initialCount={track.likeCount}
            />
            <AddToPlaylistButton trackId={track.id} label={t('track.addToPlaylist')} />
            <ShareButton title={track.title} label={t('common.share')} />
            <ReportButton
              targetType="track"
              targetId={track.id}
              label={t('common.report')}
            />
          </div>
          {track.description ? (
            <p className="mt-4 max-w-2xl whitespace-pre-line text-sm text-muted">
              {track.description}
            </p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1.5fr_0.5fr]">
        <div className="space-y-8">
          {track.lyrics ? (
            <section className="card p-5">
              <h2 className="mb-3 text-lg font-bold text-ink">{t('track.lyrics')}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink/85">
                {track.lyrics}
              </p>
            </section>
          ) : null}

          <CommentSection trackId={track.id} initialComments={comments} locale={locale} />
        </div>
        <aside className="space-y-5">
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
              {t('track.credits')}
            </h2>
            <dl className="space-y-2 text-sm">
              {metadata.map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-3">
                  <dt className="text-muted">{item.label}</dt>
                  <dd className="text-end font-medium text-ink">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {track.moods && track.moods.length > 0 ? (
            <div className="card p-4">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
                {t('track.moods')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {track.moods.map((mood) => (
                  <Link
                    key={mood.id}
                    href={`/${locale}/moods/${mood.slug}`}
                    className="rounded-pill border border-white/10 bg-white/5 px-3 py-1 text-xs text-ink hover:border-cyan/40"
                  >
                    {locale === 'ar' ? mood.labelAr : mood.labelEn}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          <div className="card p-4">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
              {t('track.aiTools')}
            </h2>
            <p className="text-sm text-ink/85">{track.aiTools || '—'}</p>
            {track.credits ? (
              <p className="mt-3 whitespace-pre-line text-xs text-muted">
                {track.credits}
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="mt-12">
          <SectionHeader title={t('track.related')} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <TrackCard key={item.id} track={item} queue={related} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
