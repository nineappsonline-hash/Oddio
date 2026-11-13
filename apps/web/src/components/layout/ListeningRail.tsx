'use client';

import Link from 'next/link';
import {
  Headphones,
  ListMusic,
  Pause,
  Play,
  SkipForward,
  Disc3,
  ArrowUpRight,
  Waves,
} from 'lucide-react';
import { useLocalePath } from '@/lib/use-locale-path';
import { usePlayer } from '@/lib/player-store';
import { Artwork } from '@/components/ui/Artwork';
import { formatDuration } from '@/lib/utils';

/** A real, live Now Playing / Next Up column, not static demo song names. */
export function ListeningRail() {
  const { locale } = useLocalePath();
  const ar = locale === 'ar';
  const track = usePlayer((state) => state.track);
  const queue = usePlayer((state) => state.queue);
  const playing = usePlayer((state) => state.isPlaying);
  const toggle = usePlayer((state) => state.toggle);
  const next = usePlayer((state) => state.next);
  const jumpTo = usePlayer((state) => state.jumpTo);
  const setExpanded = usePlayer((state) => state.setExpanded);

  return (
    <aside
      className="oddio-listening-rail"
      aria-label={ar ? 'الاستماع الحالي' : 'Listening room'}
    >
      <div className="oddio-rail-heading">
        <div className="oddio-rail-heading-icon">
          <Waves size={17} />
        </div>
        <div>
          <p className="oddio-micro-label">{ar ? 'غرفة الاستماع' : 'LISTENING ROOM'}</p>
          <h2>{ar ? 'بيشتغل دلوقتي' : 'Now playing'}</h2>
        </div>
        <span
          className="oddio-rail-live"
          aria-label={ar ? 'مشغل الموسيقى' : 'Music player'}
        />
      </div>

      {track ? (
        <>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="oddio-rail-art-button"
            aria-label={ar ? 'عرض مشغل الأغنية' : 'Open full player'}
          >
            <Artwork
              title={track.title}
              url={track.artwork.url}
              accent={track.artwork.accent}
              className="aspect-square w-full"
              rounded="rounded-[1.3rem]"
            />
            <span className="oddio-rail-art-shine" aria-hidden="true" />
          </button>
          <div className="oddio-rail-track-meta">
            <div className="min-w-0">
              <Link prefetch={false}
                className="oddio-rail-track-name"
                href={`/${locale}/tracks/${track.id}-${track.slug}`}
              >
                {track.title}
              </Link>
              <span>
                {track.artist?.name ?? (ar ? 'فنان مستقل' : 'Independent artist')}
              </span>
            </div>
            <Disc3
              size={23}
              className={playing ? 'oddio-spinning-record' : ''}
              aria-hidden="true"
            />
          </div>
          <div className="oddio-rail-transport">
            <button
              type="button"
              aria-label={playing ? (ar ? 'إيقاف مؤقت' : 'Pause') : ar ? 'تشغيل' : 'Play'}
              onClick={toggle}
              className="oddio-rail-play"
            >
              {playing ? (
                <Pause size={19} fill="currentColor" />
              ) : (
                <Play size={19} fill="currentColor" />
              )}
            </button>
            <button
              type="button"
              aria-label={ar ? 'الأغنية التالية' : 'Next track'}
              onClick={() => next()}
              className="oddio-rail-next"
            >
              <SkipForward size={18} />
            </button>
            <span className="oddio-rail-duration">
              {formatDuration(track.durationMs)}
            </span>
          </div>
        </>
      ) : (
        <div className="oddio-rail-empty">
          <span className="oddio-rail-empty-disc">
            <Headphones size={46} strokeWidth={1.4} />
          </span>
          <h3>{ar ? 'الموسيقى مستنياك' : 'Let the music find you.'}</h3>
          <p>
            {ar
              ? 'شغّل أي أغنية علشان تظهر هنا، أو ابدأ بالمود اللي يناسبك.'
              : 'Play a track to bring your listening room to life.'}
          </p>
          <Link prefetch={false} href={`/${locale}/soundspace`}>
            {ar ? 'اكتشف مودك' : 'Explore your mood'} <ArrowUpRight size={15} />
          </Link>
        </div>
      )}

      <div className="oddio-rail-queue-header">
        <span className="flex items-center gap-2">
          <ListMusic size={17} />
          {ar ? 'التالي في الطابور' : 'Next up'}
        </span>
        <span>{queue.length}</span>
      </div>
      <div className="oddio-rail-queue" aria-live="polite">
        {queue.length ? (
          queue.slice(0, 5).map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => jumpTo(item.id)}
              className="oddio-rail-queue-item"
              aria-label={`${ar ? 'شغّل' : 'Play'} ${item.title}`}
            >
              <Artwork
                title={item.title}
                url={item.artwork.url}
                accent={item.artwork.accent}
                className="h-11 w-11 shrink-0"
                rounded="rounded-lg"
              />
              <span className="min-w-0 flex-1 text-start">
                <span className="block truncate font-semibold text-ink">
                  {item.title}
                </span>
                <span className="block truncate text-xs text-muted">
                  {item.artist?.name}
                </span>
              </span>
              <span className="text-xs tabular-nums text-muted">{index + 1}</span>
            </button>
          ))
        ) : (
          <div className="oddio-rail-queue-empty">
            {ar
              ? 'لما تختار مجموعة أغاني، هتظهر اللي بعدها هنا.'
              : 'Your upcoming tracks will appear here.'}
          </div>
        )}
      </div>
      <Link prefetch={false} className="oddio-rail-footer-link" href={`/${locale}/discover`}>
        {ar ? 'استكشف مزيد من الموسيقى' : 'Find more music'} <ArrowUpRight size={15} />
      </Link>
    </aside>
  );
}
