import Link from 'next/link';
import { Mic2, Headphones, ArrowUpRight, Radio, Clock3 } from 'lucide-react';
import { OddioPlayIcon } from '@/components/ui/OddioPlayIcon';
import { PodcastPlaySurface } from '@/components/podcasts/PodcastPlaySurface';
import { AutoScrollTitle } from '@/components/ui/AutoScrollTitle';
import type {
  PodcastCategory,
  PodcastShow,
  PodcastEpisode,
} from '@/lib/podcasts/catalog';
import { formatPodcastTime, podcastCategoryLabel } from '@/lib/podcasts/catalog';

export function PodcastArtwork({
  title,
  coverUrl,
  className = '',
}: {
  title: string;
  coverUrl: string | null;
  className?: string;
}) {
  return (
    <div
      className={`relative isolate grid aspect-square shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#414244] via-[#292b2d] to-[#131416] ${className}`}
    >
      {coverUrl ? (
        // Show images may come from creator-approved external sources; no asset proxy is required.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt={title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          <span
            className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.18),transparent_50%)]"
            aria-hidden="true"
          />
          <span
            className="grid h-1/2 w-1/2 place-items-center rounded-full border-4 border-white/45 bg-[#171819]/55 shadow-xl"
            aria-hidden="true"
          >
            <Mic2 className="h-1/2 w-1/2 text-[#dddddd]" />
          </span>
        </>
      )}
    </div>
  );
}

/** Fixed, topic-specific editorial covers; image-only decoration with text below. */
const PODCAST_CATEGORY_COVERS: Record<string, string> = {
  technology: 'photo-1518770660439-4636190af475',
  business: 'photo-1460925895917-afdab827c52f',
  education: 'photo-1503676260728-1c00da094a0b',
  science: 'photo-1532094349884-543bc11b234d',
  culture: 'photo-1514525253161-7a46d19cd819',
  comedy: 'photo-1503095396549-807759245b35',
  stories: 'photo-1497633762265-9d179a990aa6',
  health: 'photo-1506126613408-eca07ce68773',
  news: 'photo-1495020689067-958852a7765e',
  sports: 'photo-1461896836934-ffe607ba8211',
  music: 'photo-1516280440614-37939bbacd81',
};
function categoryCover(slug: string, width = 400) {
  const imageId = PODCAST_CATEGORY_COVERS[slug] ?? 'photo-1478737270239-2f02b77fc618';
  // Responsive editorial covers preserve the exact photo/crop while avoiding
  // transferring a 580px asset to a narrow category tile.
  return `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=${width}&h=${Math.round(width * 1.25)}&q=70`;
}

export function PodcastCategoryCard({
  category,
  locale,
}: {
  category: PodcastCategory;
  locale: 'ar' | 'en';
}) {
  const name = podcastCategoryLabel(category, locale);
  return (
    <Link
      prefetch={false}
      href={`/${locale}/podcasts/categories/${category.slug}`}
      className="group relative flex h-full min-h-[185px] min-w-0 flex-col overflow-hidden rounded-[22px] border border-white/[0.13] bg-white/[0.055] p-2.5 shadow-[0_14px_35px_rgba(0,0,0,.18),inset_0_1px_0_rgba(255,255,255,.07)] backdrop-blur-2xl transition-colors duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:min-h-[215px] sm:p-3"
    >
      <span className="relative flex aspect-[5/6] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/[0.12] bg-gradient-to-br from-[#343638] via-[#202123] to-[#111214]">
        <Radio className="absolute h-11 w-11 text-white/40" />
        {/* Category images are editorial illustrations of topics, not creator covers. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={categoryCover(category.slug)}
          srcSet={`${categoryCover(category.slug, 240)} 240w, ${categoryCover(category.slug, 400)} 400w, ${categoryCover(category.slug, 580)} 580w`}
          sizes="(max-width: 640px) 42vw, (max-width: 1024px) 23vw, (max-width: 1536px) 18vw, 14vw"
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover brightness-[0.73] saturate-[0.70] transition-transform duration-500 group-hover:scale-[1.065]"
        />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
        <span className="absolute inset-x-3 bottom-3 z-10 block min-w-0 rounded-lg bg-black/20 px-1 py-1.5 text-start drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] backdrop-blur-[2px] sm:inset-x-4 sm:bottom-4">
          <AutoScrollTitle
            text={name}
            lines={2}
            className="text-lg font-black tracking-tight text-white sm:text-xl"
          />
        </span>
      </span>
      <span className="mt-auto flex w-full items-center justify-between gap-2 pt-1.5 text-[11px] font-semibold text-[#a8a8a8]">
        <span>{locale === 'ar' ? 'استكشف التصنيف' : 'Explore category'}</span>
        <ArrowUpRight
          className="h-4 w-4 shrink-0 text-[#dddddd] rtl:-scale-x-100"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

export function PodcastShowCard({
  show,
  locale,
}: {
  show: PodcastShow;
  locale: 'ar' | 'en';
}) {
  return (
    <Link
      prefetch={false}
      href={`/${locale}/podcasts/shows/${show.slug}`}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-white/[0.13] bg-white/[0.055] p-3 shadow-[0_14px_35px_rgba(0,0,0,.18),inset_0_1px_0_rgba(255,255,255,.07)] backdrop-blur-2xl transition-colors duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:p-3.5"
    >
      <PodcastArtwork
        title={show.title}
        coverUrl={show.coverUrl}
        className="w-full !rounded-2xl"
      />
      <h3 className="mt-3 min-w-0">
        <AutoScrollTitle
          text={show.title}
          lines={2}
          className="text-sm font-bold text-white sm:text-base"
        />
      </h3>
      <p
        dir="auto"
        className="mt-auto w-full truncate pt-2 text-xs leading-5 text-[#c4c4c4]"
      >
        {show.author}
      </p>
    </Link>
  );
}

export function PodcastEpisodeCard({
  episode,
  show,
  locale,
}: {
  episode: PodcastEpisode;
  show: PodcastShow | undefined;
  locale: 'ar' | 'en';
}) {
  if (!show) return null;
  return (
    <PodcastPlaySurface
      episode={episode}
      show={show}
      locale={locale}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-white/[0.13] bg-white/[0.055] p-3 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary shadow-[0_14px_35px_rgba(0,0,0,.18),inset_0_1px_0_rgba(255,255,255,.07)] backdrop-blur-2xl transition-colors duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.09] sm:p-3.5"
    >
      <span className="relative block w-full">
        <PodcastArtwork
          title={episode.title}
          coverUrl={show.coverUrl}
          className="w-full !rounded-2xl"
        />
        <span
          className="absolute bottom-2 end-2 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-[#171819]/85 shadow-lg backdrop-blur-xl transition-transform group-hover:scale-110"
          aria-hidden="true"
        >
          <OddioPlayIcon size={39} />
        </span>
      </span>
      <AutoScrollTitle
        text={episode.title}
        lines={2}
        className="mt-3 text-sm font-bold text-white sm:text-base"
      />
      <span
        dir="auto"
        className="mt-1 block w-full truncate text-xs leading-5 text-[#c4c4c4]"
      >
        {show.title}
      </span>
      <span
        className="mt-auto flex w-full items-center gap-1.5 pt-3 text-xs text-[#c4c4c4]"
        dir="ltr"
      >
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        {episode.durationSeconds > 0
          ? formatPodcastTime(episode.durationSeconds)
          : locale === 'ar'
            ? 'حلقة صوتية'
            : 'Audio episode'}
      </span>
    </PodcastPlaySurface>
  );
}

/**
 * Show-detail episode row: deliberately separate from the compact episode cards
 * used across discovery, so long RTL titles get comfortable readable space.
 */
export function PodcastEpisodeRow({
  episode,
  show,
  locale,
  index,
  upcoming = [],
}: {
  episode: PodcastEpisode;
  show: PodcastShow;
  locale: 'ar' | 'en';
  index: number;
  upcoming?: PodcastEpisode[];
}) {
  const ar = locale === 'ar';
  const number = episode.episodeNumber ?? index + 1;
  const duration =
    episode.durationSeconds > 0 ? formatPodcastTime(episode.durationSeconds) : null;
  return (
    <PodcastPlaySurface
      episode={episode}
      show={show}
      locale={locale}
      upcoming={upcoming}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[20px] border border-white/[0.13] bg-white/[0.055] backdrop-blur-2xl p-3.5 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary shadow-[0_12px_32px_rgba(0,0,0,0.15)] transition-colors duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.09] hover:shadow-[0_18px_42px_rgba(0,0,0,0.25)] sm:p-4"
    >
      <span className="relative block w-full overflow-hidden rounded-2xl">
        <PodcastArtwork
          title={show.title}
          coverUrl={show.coverUrl}
          className="w-full !rounded-2xl"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-3 end-3 grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-[#171819]/85 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110"
        >
          <OddioPlayIcon size={43} />
        </span>
      </span>
      <span className="mt-4 flex w-full min-w-0 flex-1 flex-col gap-2 px-0.5 pb-1">
        <span className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-[#cccccc]">
          {ar ? `الحلقة ${number}` : `EPISODE ${number}`}
          {episode.seasonNumber && episode.seasonNumber > 1 ? (
            <span className="text-[#999999]">
              · {ar ? `الموسم ${episode.seasonNumber}` : `Season ${episode.seasonNumber}`}
            </span>
          ) : null}
        </span>
        <AutoScrollTitle
          text={episode.title}
          lines={2}
          className="text-base font-bold text-white sm:text-lg"
        />
        <span className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-[#c4c4c4]">
          <span className="inline-flex items-center gap-1.5" dir="ltr">
            <Clock3 size={14} aria-hidden="true" />
            {duration ?? (ar ? 'حلقة صوتية' : 'Audio episode')}
          </span>
          <span className="text-[#dddddd]">{ar ? 'استمع الآن' : 'Listen now'}</span>
        </span>
      </span>
    </PodcastPlaySurface>
  );
}

export function PodcastEmpty({
  locale,
  what = 'episodes',
}: {
  locale: 'ar' | 'en';
  what?: 'shows' | 'episodes' | 'search';
}) {
  const ar = locale === 'ar';
  const copy =
    what === 'search'
      ? ar
        ? 'مفيش نتائج مطابقة للبحث. جرّب كلمة تانية أو تصنيف مختلف.'
        : 'No matches yet. Try another keyword or category.'
      : what === 'shows'
        ? ar
          ? 'برامج البودكاست الجديدة هتظهر هنا أول ما تتنشر.'
          : 'New podcast shows will appear here as they are published.'
        : ar
          ? 'الحلقات الجديدة هتظهر هنا أول ما تتنشر.'
          : 'New episodes will appear here as creators publish them.';
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.035] px-5 py-10 text-center text-[#c4c4c4] sm:px-8 sm:py-12">
      <Headphones className="h-9 w-9 text-[#dddddd]" aria-hidden="true" />
      <p className="max-w-md text-sm leading-7" role="status">
        {copy}
      </p>
    </div>
  );
}
