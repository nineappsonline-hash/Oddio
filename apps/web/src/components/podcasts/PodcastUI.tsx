import Link from 'next/link';
import { Mic2, Headphones, ArrowUpRight, Radio, Clock3 } from 'lucide-react';
import { OddioPlayIcon } from '@/components/ui/OddioPlayIcon';
import { PodcastInlinePlayButton } from '@/components/podcasts/PodcastInlinePlayButton';
import type { PodcastCategory, PodcastShow, PodcastEpisode } from '@/lib/podcasts/catalog';
import { formatPodcastTime, podcastCategoryLabel } from '@/lib/podcasts/catalog';

export function PodcastArtwork({
  title, coverUrl, className = '',
}: { title: string; coverUrl: string | null; className?: string }) {
  return (
    <div className={`relative isolate grid aspect-square shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#6c448c] via-[#365b77] to-[#281d35] ${className}`}>
      {coverUrl ? (
        // Show images may come from creator-approved external sources; no asset proxy is required.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt={title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(234,185,151,0.45),transparent_50%)]" aria-hidden="true" />
          <span className="grid h-1/2 w-1/2 place-items-center rounded-full border-4 border-[#eab997]/65 bg-[#20172d]/45 shadow-xl" aria-hidden="true">
            <Mic2 className="h-1/2 w-1/2 text-[#f3d0b6]" />
          </span>
        </>
      )}
    </div>
  );
}

export function PodcastCategoryCard({ category, locale }: { category: PodcastCategory; locale: 'ar' | 'en' }) {
  const name = podcastCategoryLabel(category, locale);
  return (
    <Link prefetch={false} href={`/${locale}/podcasts/categories/${category.slug}`}
      className="group relative flex min-h-[113px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#3e2b51] to-[#1d2937] p-4 transition hover:-translate-y-0.5 hover:border-[#eab997]/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#eab997]">
      <Radio className="h-5 w-5 text-[#eab997]" aria-hidden="true" />
      <span className="flex items-end justify-between gap-2 text-base font-bold text-white">
        <span className="min-w-0 break-words">{name}</span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-[#eab997] rtl:-scale-x-100" aria-hidden="true" />
      </span>
    </Link>
  );
}

export function PodcastShowCard({ show, locale }: { show: PodcastShow; locale: 'ar' | 'en' }) {
  return (
    <Link prefetch={false} href={`/${locale}/podcasts/shows/${show.slug}`}
      className="group min-w-0 rounded-2xl border border-white/10 bg-[#241b2d] p-3 transition hover:border-[#eab997]/60 hover:bg-[#30233a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#eab997]">
      <PodcastArtwork title={show.title} coverUrl={show.coverUrl} className="w-full" />
      <h3 className="mt-3 line-clamp-2 text-base font-bold text-white group-hover:text-[#eab997]">{show.title}</h3>
      <p className="mt-1 truncate text-xs text-[#b8adbf]">{show.author}</p>
    </Link>
  );
}

export function PodcastEpisodeCard({ episode, show, locale }: {
  episode: PodcastEpisode; show: PodcastShow | undefined; locale: 'ar' | 'en';
}) {
  return (
    <Link prefetch={false} href={`/${locale}/podcasts/episodes/${episode.id}`}
      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-[#241b2d] p-3 transition hover:border-[#eab997]/60 hover:bg-[#30233a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#eab997]">
      <PodcastArtwork title={episode.title} coverUrl={show?.coverUrl ?? null} className="h-16 w-16 sm:h-20 sm:w-20" />
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-bold text-white group-hover:text-[#eab997] sm:text-base">{episode.title}</h3>
        <p className="mt-1 truncate text-xs text-[#b8adbf]">{show?.title ?? (locale === 'ar' ? 'بودكاست' : 'Podcast')}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-xs text-[#eab997]"><Clock3 className="h-3 w-3" /> {episode.durationSeconds > 0 ? formatPodcastTime(episode.durationSeconds) : (locale === 'ar' ? 'حلقة صوتية' : 'Audio episode')}</span>
      </div>
      <span className="grid h-12 w-12 shrink-0 place-items-center" aria-hidden="true"><OddioPlayIcon size={46} /></span>
    </Link>
  );
}

/**
 * Show-detail episode row: deliberately separate from the compact episode cards
 * used across discovery, so long RTL titles get comfortable readable space.
 */
export function PodcastEpisodeRow({ episode, show, locale, index }: {
  episode: PodcastEpisode;
  show: PodcastShow;
  locale: 'ar' | 'en';
  index: number;
}) {
  const ar = locale === 'ar';
  const number = episode.episodeNumber ?? index + 1;
  const duration = episode.durationSeconds > 0 ? formatPodcastTime(episode.durationSeconds) : null;
  return (
    <div
      className="group flex w-full min-w-0 items-center gap-3 rounded-2xl border border-white/[0.09] bg-[#1d1922] px-3 py-3 transition-all duration-200 hover:border-[#a06cc5]/55 hover:bg-[#292131] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b88be5] sm:gap-5 sm:px-5 sm:py-4"
    >
      <span className="hidden w-7 shrink-0 text-center text-sm font-semibold tabular-nums text-[#8e829b] sm:block" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      <PodcastArtwork
        title={show.title}
        coverUrl={show.coverUrl}
        className="!rounded-xl h-[66px] w-[66px] sm:h-[84px] sm:w-[84px]"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-[#bca0d6]">
          <span>{ar ? `الحلقة ${number}` : `EPISODE ${number}`}</span>
          {episode.seasonNumber && episode.seasonNumber > 1 ? (
            <span className="text-[#82758d]">· {ar ? `الموسم ${episode.seasonNumber}` : `Season ${episode.seasonNumber}`}</span>
          ) : null}
        </span>
        <Link prefetch={false} href={`/${locale}/podcasts/episodes/${episode.id}`} className="block min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c49bea]">
          <h3 dir="auto" className="line-clamp-2 min-w-0 break-words text-sm font-bold leading-6 text-white transition-colors group-hover:text-[#e4c4ff] sm:text-[17px] sm:leading-7">
            {episode.title}
          </h3>
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#aaa0b2]">
          {duration ? (
            <span className="inline-flex items-center gap-1.5" dir="ltr">
              <Clock3 size={13} aria-hidden="true" />{duration}
            </span>
          ) : null}
          {episode.description ? <span dir="auto" className="hidden max-w-[36rem] truncate text-[#8f849a] md:inline">{episode.description}</span> : null}
        </div>
      </div>
      <PodcastInlinePlayButton episode={episode} show={show} locale={locale} />
    </div>
  );
}

export function PodcastEmpty({ locale, what = 'episodes' }: { locale: 'ar' | 'en'; what?: 'shows' | 'episodes' | 'search' }) {
  const ar = locale === 'ar';
  const copy = what === 'search'
    ? (ar ? 'مفيش نتائج مطابقة للبحث. جرّب كلمة تانية أو تصنيف مختلف.' : 'No matches yet. Try another keyword or category.')
    : what === 'shows'
      ? (ar ? 'برامج البودكاست الجديدة هتظهر هنا أول ما تتنشر.' : 'New podcast shows will appear here as they are published.')
      : (ar ? 'الحلقات الجديدة هتظهر هنا أول ما تتنشر.' : 'New episodes will appear here as creators publish them.');
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/20 bg-[#231b2b]/70 px-5 py-10 text-center text-[#b8adbf]">
      <Headphones className="h-9 w-9 text-[#eab997]" aria-hidden="true" />
      <p className="max-w-md text-sm leading-7">{copy}</p>
    </div>
  );
}
