import Link from 'next/link';
import { Mic2, Headphones, ArrowUpRight, Radio, Clock3 } from 'lucide-react';
import { OddioPlayIcon } from '@/components/ui/OddioPlayIcon';
import { PodcastPlaySurface } from '@/components/podcasts/PodcastPlaySurface';
import type { PodcastCategory, PodcastShow, PodcastEpisode } from '@/lib/podcasts/catalog';
import { formatPodcastTime, podcastCategoryLabel } from '@/lib/podcasts/catalog';

export function PodcastArtwork({
  title, coverUrl, className = '',
}: { title: string; coverUrl: string | null; className?: string }) {
  return (
    <div className={`relative isolate grid aspect-square shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#414244] via-[#292b2d] to-[#131416] ${className}`}>
      {coverUrl ? (
        // Show images may come from creator-approved external sources; no asset proxy is required.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt={title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.18),transparent_50%)]" aria-hidden="true" />
          <span className="grid h-1/2 w-1/2 place-items-center rounded-full border-4 border-white/45 bg-[#171819]/55 shadow-xl" aria-hidden="true">
            <Mic2 className="h-1/2 w-1/2 text-[#dddddd]" />
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
      className="group relative flex h-full min-h-[224px] min-w-0 flex-col overflow-hidden rounded-[22px] border border-white/[0.13] bg-white/[0.055] p-3.5 shadow-[0_14px_35px_rgba(0,0,0,.18),inset_0_1px_0_rgba(255,255,255,.07)] backdrop-blur-2xl transition-all duration-200 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 sm:min-h-[260px] sm:p-4">
      <span className="relative flex aspect-[5/4] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#343638] via-[#202123] to-[#111214]" aria-hidden="true">
        <span className="pointer-events-none absolute -top-1/2 left-0 h-full w-full rounded-full bg-white/[0.06] blur-2xl" />
        <Radio className="relative h-10 w-10 text-[#d4d4d4] opacity-90 transition-transform duration-200 group-hover:scale-110 sm:h-12 sm:w-12" />
        <span className="absolute bottom-2 start-2 text-[10px] font-bold uppercase tracking-widest text-white/45">ODDIO</span>
      </span>
      <span dir="auto" className="mt-4 line-clamp-2 min-w-0 text-base font-bold leading-6 text-white sm:text-lg">{name}</span>
      <span className="mt-auto flex w-full items-center justify-between gap-2 pt-3 text-xs font-semibold text-[#a8a8a8]">
        <span>{locale === 'ar' ? 'استكشف التصنيف' : 'Explore category'}</span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-[#dddddd] rtl:-scale-x-100" aria-hidden="true" />
      </span>
    </Link>
  );
}

export function PodcastShowCard({ show, locale }: { show: PodcastShow; locale: 'ar' | 'en' }) {
  return (
    <Link prefetch={false} href={`/${locale}/podcasts/shows/${show.slug}`}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-white/[0.13] bg-white/[0.055] p-3 shadow-[0_14px_35px_rgba(0,0,0,.18),inset_0_1px_0_rgba(255,255,255,.07)] backdrop-blur-2xl transition-all duration-200 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 sm:p-3.5">
      <PodcastArtwork title={show.title} coverUrl={show.coverUrl} className="w-full !rounded-2xl" />
      <h3 dir="auto" className="mt-3 line-clamp-2 min-h-[3rem] text-sm font-bold leading-6 text-white sm:text-base">{show.title}</h3>
      <p dir="auto" className="mt-auto truncate pt-2 text-xs text-[#aaaaaa]">{show.author}</p>
    </Link>
  );
}

export function PodcastEpisodeCard({ episode, show, locale }: {
  episode: PodcastEpisode; show: PodcastShow | undefined; locale: 'ar' | 'en';
}) {
  if (!show) return null;
  return (
    <PodcastPlaySurface episode={episode} show={show} locale={locale}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-white/[0.13] bg-white/[0.055] p-3 text-start shadow-[0_14px_35px_rgba(0,0,0,.18),inset_0_1px_0_rgba(255,255,255,.07)] backdrop-blur-2xl transition-all duration-200 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.09] sm:p-3.5">
      <span className="relative block w-full">
        <PodcastArtwork title={episode.title} coverUrl={show.coverUrl} className="w-full !rounded-2xl" />
        <span className="absolute bottom-2 end-2 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-[#171819]/85 shadow-lg backdrop-blur-xl transition-transform group-hover:scale-110" aria-hidden="true">
          <OddioPlayIcon size={39} />
        </span>
      </span>
      <span dir="auto" className="mt-3 line-clamp-2 min-h-[3rem] w-full text-sm font-bold leading-6 text-white sm:text-base">{episode.title}</span>
      <span dir="auto" className="mt-1 block w-full truncate text-xs text-[#b5b5b5]">{show.title}</span>
      <span className="mt-auto flex w-full items-center gap-1.5 pt-3 text-xs text-[#aaaaaa]" dir="ltr">
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        {episode.durationSeconds > 0 ? formatPodcastTime(episode.durationSeconds) : (locale === 'ar' ? 'حلقة صوتية' : 'Audio episode')}
      </span>
    </PodcastPlaySurface>
  );
}

/**
 * Show-detail episode row: deliberately separate from the compact episode cards
 * used across discovery, so long RTL titles get comfortable readable space.
 */
export function PodcastEpisodeRow({ episode, show, locale, index, upcoming = [] }: {
  episode: PodcastEpisode;
  show: PodcastShow;
  locale: 'ar' | 'en';
  index: number;
  upcoming?: PodcastEpisode[];
}) {
  const ar = locale === 'ar';
  const number = episode.episodeNumber ?? index + 1;
  const duration = episode.durationSeconds > 0 ? formatPodcastTime(episode.durationSeconds) : null;
  return (
    <PodcastPlaySurface episode={episode} show={show} locale={locale} upcoming={upcoming}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[20px] border border-white/[0.13] bg-white/[0.055] backdrop-blur-2xl p-3.5 text-start shadow-[0_12px_32px_rgba(0,0,0,0.15)] transition-all duration-200 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.09] hover:shadow-[0_18px_42px_rgba(0,0,0,0.25)] sm:p-4"
    >
      <span className="relative block w-full overflow-hidden rounded-2xl">
        <PodcastArtwork title={show.title} coverUrl={show.coverUrl} className="w-full !rounded-2xl" />
        <span aria-hidden="true" className="absolute bottom-3 end-3 grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-[#171819]/85 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110">
          <OddioPlayIcon size={43} />
        </span>
      </span>
      <span className="mt-4 flex w-full min-w-0 flex-1 flex-col gap-2 px-0.5 pb-1">
        <span className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-[#cccccc]">
          {ar ? `الحلقة ${number}` : `EPISODE ${number}`}
          {episode.seasonNumber && episode.seasonNumber > 1 ? (
            <span className="text-[#999999]">· {ar ? `الموسم ${episode.seasonNumber}` : `Season ${episode.seasonNumber}`}</span>
          ) : null}
        </span>
        <span dir="auto" className="line-clamp-2 min-h-[3.25rem] w-full break-words text-base font-bold leading-[1.65rem] text-white transition-colors group-hover:text-white sm:text-lg">
          {episode.title}
        </span>
        <span className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-[#aaaaaa]">
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

export function PodcastEmpty({ locale, what = 'episodes' }: { locale: 'ar' | 'en'; what?: 'shows' | 'episodes' | 'search' }) {
  const ar = locale === 'ar';
  const copy = what === 'search'
    ? (ar ? 'مفيش نتائج مطابقة للبحث. جرّب كلمة تانية أو تصنيف مختلف.' : 'No matches yet. Try another keyword or category.')
    : what === 'shows'
      ? (ar ? 'برامج البودكاست الجديدة هتظهر هنا أول ما تتنشر.' : 'New podcast shows will appear here as they are published.')
      : (ar ? 'الحلقات الجديدة هتظهر هنا أول ما تتنشر.' : 'New episodes will appear here as creators publish them.');
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/20 bg-white/[0.045] backdrop-blur-xl px-5 py-10 text-center text-[#b5b5b5]">
      <Headphones className="h-9 w-9 text-[#dddddd]" aria-hidden="true" />
      <p className="max-w-md text-sm leading-7">{copy}</p>
    </div>
  );
}
