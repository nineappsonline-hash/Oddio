import Link from 'next/link';
import { ShareButton } from '@/components/community/ShareButton';
import { podcastAsTrack } from '@/lib/podcast-playback';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import {
  getPodcastCatalog,
  formatPodcastTime,
  isPodcastId,
} from '@/lib/podcasts/catalog';
import {
  podcastEpisodeDescription,
  podcastMetaDescription,
} from '@/lib/podcasts/editorial-notes';
import { PodcastArtwork } from '@/components/podcasts/PodcastUI';
import { PodcastEpisodePlayer } from '@/components/podcasts/PodcastEpisodePlayer';
import { JsonLd } from '@/components/seo/JsonLd';
import { seoAbsoluteUrl } from '@/lib/seo-origin';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : 'en';
  const catalog = await getPodcastCatalog();
  const episode = isPodcastId(id) ? catalog.episodes.find((e) => e.id === id) : undefined;
  const show = catalog.shows.find((s) => s.id === episode?.showId);
  const arabic = episode ? /[\u0600-\u06FF]/.test(episode.title) : locale === 'ar';
  const author = show?.title ?? (arabic ? 'بودكاست' : 'Podcast');
  const summary =
    episode && show ? podcastEpisodeDescription(episode, show.slug, locale) : '';
  return buildMetadata({
    locale,
    path: `/podcasts/episodes/${id}`,
    title: episode ? episode.title : 'Podcast episode',
    socialTitle: episode?.title,
    description: episode
      ? podcastMetaDescription(summary) ||
        (arabic
          ? `اسمع «${episode.title}» من بودكاست ${author} على Oddio.`
          : `Listen to “${episode.title}” from ${author} on Oddio.`)
      : '',
    noindex: !episode || !show,
    image: show?.coverUrl,
    imageAlt: episode ? `${episode.title} — ${author}` : undefined,
  });
}

export default async function PodcastEpisodePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !isPodcastId(id)) notFound();
  const catalog = await getPodcastCatalog(),
    episode = catalog.episodes.find((e) => e.id === id);
  const show = catalog.shows.find((s) => s.id === episode?.showId);
  if (!episode || !show) notFound();
  const ar = locale === 'ar';
  const summary = podcastEpisodeDescription(episode, show.slug, locale);
  const related = catalog.episodes
    .filter((item) => item.showId === show.id && item.id !== episode.id)
    .slice(0, 3);
  return (
    <div className="mx-auto max-w-4xl space-y-7 pb-8">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'PodcastEpisode',
          name: episode.title,
          description: summary || undefined,
          url: seoAbsoluteUrl(`/${locale}/podcasts/episodes/${episode.id}`),
          datePublished: episode.publishedAt,
          ...(episode.durationSeconds > 0
            ? { timeRequired: `PT${episode.durationSeconds}S` }
            : {}),
          partOfSeries: {
            '@type': 'PodcastSeries',
            name: show.title,
            url: seoAbsoluteUrl(`/${locale}/podcasts/shows/${show.slug}`),
          },
        }}
      />
      <Link
        href={`/${locale}/podcasts/shows/${show.slug}`}
        className="inline-flex text-sm font-semibold text-[#e9e9e9] hover:underline"
      >
        {ar ? '← رجوع للبرنامج' : '← Back to show'}
      </Link>
      <header className="grid items-center gap-6 rounded-3xl border border-white/10 bg-[#202020] p-5 sm:grid-cols-[210px_minmax(0,1fr)] sm:p-8">
        <PodcastArtwork
          title={show.title}
          coverUrl={show.coverUrl}
          className="mx-auto w-full max-w-[210px]"
        />
        <div className="min-w-0 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[#e9e9e9]">
            {ar ? 'حلقة بودكاست' : 'PODCAST EPISODE'}
          </p>
          <h1 className="break-words text-2xl font-black text-white sm:text-4xl">
            {episode.title}
          </h1>
          <ShareButton
            title={episode.title}
            storyTrack={podcastAsTrack(episode, show)}
            label={ar ? 'مشاركة' : 'Share'}
            url={`/${locale}/podcasts/episodes/${episode.id}`}
          />
          <Link
            href={`/${locale}/podcasts/shows/${show.slug}`}
            className="block text-sm font-semibold text-[#e9e9e9] hover:underline"
          >
            {show.title}
          </Link>
          {episode.episodeNumber !== null ? (
            <p className="text-xs font-semibold text-[#e9e9e9]">
              {ar
                ? `الموسم ${episode.seasonNumber ?? 1} · الحلقة ${episode.episodeNumber}`
                : `Season ${episode.seasonNumber ?? 1} · Episode ${episode.episodeNumber}`}
            </p>
          ) : null}
          <p className="text-xs text-[#a3a3a3]" dir="auto">
            {episode.publishedAt
              ? new Date(episode.publishedAt).toLocaleDateString(ar ? 'ar-EG' : 'en-US', {
                  dateStyle: 'medium',
                })
              : ''}
            {episode.durationSeconds > 0
              ? ` · ${formatPodcastTime(episode.durationSeconds)}`
              : ''}
          </p>
        </div>
      </header>
      <PodcastEpisodePlayer episode={episode} show={show} locale={locale} />
      {summary ? (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#202020] p-5">
          <h2 className="text-xl font-bold text-white">
            {ar ? 'عن الحلقة' : 'About this episode'}
          </h2>
          <p className="whitespace-pre-line text-sm leading-8 text-[#d0c4d6]">
            {summary}
          </p>
        </section>
      ) : null}
      {related.length ? (
        <section
          aria-labelledby="related-episodes"
          className="space-y-4 rounded-2xl border border-white/10 bg-[#202020] p-5"
        >
          <h2 id="related-episodes" className="text-xl font-bold text-white">
            {ar ? `حلقات تانية من ${show.title}` : `More episodes from ${show.title}`}
          </h2>
          <ul className="divide-y divide-white/10">
            {related.map((item) => (
              <li key={item.id}>
                <Link
                  prefetch={false}
                  href={`/${locale}/podcasts/episodes/${item.id}`}
                  className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm text-[#b0ebdc] hover:underline"
                >
                  <span dir="auto">{item.title}</span>
                  {item.durationSeconds > 0 ? (
                    <span className="shrink-0 text-xs text-white/65" dir="ltr">
                      {formatPodcastTime(item.durationSeconds)}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
