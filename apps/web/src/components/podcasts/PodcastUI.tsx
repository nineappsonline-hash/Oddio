import Link from 'next/link';
import { Mic2, Headphones, ArrowUpRight, Radio, Clock3 } from 'lucide-react';
import { OddioPlayIcon } from '@/components/ui/OddioPlayIcon';
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
