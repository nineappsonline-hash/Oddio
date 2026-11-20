'use client';

import { usePlayer } from '@/lib/player-store';
import { formatDuration } from '@/lib/utils';
import { Artwork } from '@/components/ui/Artwork';
import { useEffect, useState } from 'react';

/** Uses the already-restored player session; never autoplays or exposes other users' history. */
export function ContinueListeningHome({ locale }: { locale: 'ar' | 'en' }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const track = usePlayer((state) => state.track);
  const position = usePlayer((state) => state.currentTime);
  const duration = usePlayer((state) => state.duration);
  const playing = usePlayer((state) => state.isPlaying);
  const toggle = usePlayer((state) => state.toggle);
  const expand = usePlayer((state) => state.setExpanded);
  const ar = locale === 'ar';
  if (
    !mounted ||
    !track ||
    !Number.isFinite(position) ||
    position < 15 ||
    (duration > 0 && duration - position < 15)
  )
    return null;
  const remaining = duration > 0 ? Math.max(0, duration - position) : 0;
  return (
    <section
      className="oddio-dashboard-section"
      aria-label={ar ? 'كمّل الاستماع' : 'Continue listening'}
    >
      <div className="rounded-2xl border border-primary/25 bg-white/[0.04] p-3 sm:p-4">
        <div className="mb-3">
          <p className="oddio-micro-label">
            {ar ? 'ارجع للموسيقى' : 'BACK TO YOUR MUSIC'}
          </p>
          <h2 className="text-lg font-bold text-ink">
            {ar ? 'كمّل من مكان ما وقفت' : 'Continue listening'}
          </h2>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Artwork
            title={track.title}
            url={track.artwork.url}
            accent={track.artwork.accent}
            className="h-14 w-14 shrink-0"
            rounded="rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink" dir="auto">
              {track.title}
            </p>
            <p className="truncate text-xs text-muted" dir="auto">
              {track.artist?.name ?? ''}
            </p>
            <p className="mt-1 text-xs tabular-nums text-muted">
              {formatDuration(position * 1000)}
              {remaining > 0
                ? ` · ${ar ? 'متبقي' : 'remaining'} ${formatDuration(remaining * 1000)}`
                : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label={
                playing
                  ? ar
                    ? 'إيقاف مؤقت'
                    : 'Pause'
                  : ar
                    ? 'كمّل تشغيل الأغنية'
                    : 'Resume playback'
              }
              className="min-h-11 rounded-full bg-primary px-5 text-sm font-bold text-[#211518] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {playing ? (ar ? 'إيقاف مؤقت' : 'Pause') : ar ? 'كمّل' : 'Resume'}
            </button>
            <button
              type="button"
              onClick={() => expand(true)}
              className="min-h-11 rounded-full border border-white/20 px-4 text-sm font-semibold text-ink hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {ar ? 'افتح المشغل' : 'Open player'}
            </button>
          </div>
        </div>
        {duration > 0 ? (
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label={ar ? 'تقدم الاستماع' : 'Listening progress'}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.round((position / duration) * 100))}
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, (position / duration) * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
