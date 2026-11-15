'use client';

import { useEffect, useState } from 'react';
import type { CatalogTrack } from '@/lib/data/queries';
import { TrackCard } from '@/components/music/TrackCard';
import { FlowButton } from '@/components/player/FlowButton';
import { usePlayer } from '@/lib/player-store';
import {
  readDiscoveryExclusions,
  saveDiscoveryExclusions,
  type DiscoveryExclusions,
} from '@/lib/discovery-preferences';

export function DiscoveryMixShelf({
  tracks,
  personalized,
  locale,
  viewerId,
}: {
  tracks: CatalogTrack[];
  personalized: boolean;
  locale: 'ar' | 'en';
  viewerId: string | null;
}) {
  const ar = locale === 'ar';
  const [prefs, setPrefs] = useState<DiscoveryExclusions>({
    trackIds: [],
    genreIds: [],
  });
  useEffect(() => {
    setPrefs(readDiscoveryExclusions(viewerId));
    const refresh = () => setPrefs(readDiscoveryExclusions(viewerId));
    window.addEventListener('oddio-discovery-preferences-changed', refresh);
    return () => window.removeEventListener('oddio-discovery-preferences-changed', refresh);
  }, [viewerId]);
  function update(next: DiscoveryExclusions) {
    setPrefs(next);
    saveDiscoveryExclusions(viewerId, next);
    // Also remove newly hidden music from the active station queue.
    const state = usePlayer.getState();
    if (state.station) {
      usePlayer.setState({
        queue: state.queue.filter((track) =>
          !next.trackIds.includes(track.id) &&
          !(track.genreIds?.length ? track.genreIds : [track.genreId])
            .some((id) => next.genreIds.includes(id)),
        ),
      });
    }
  }
  const visible = tracks.filter((track) =>
    !prefs.trackIds.includes(track.id) &&
    !(track.genreIds?.length ? track.genreIds : [track.genreId])
      .some((id) => prefs.genreIds.includes(id)),
  );
  const cards = visible.slice(0, 5);
  return (
    <section className="oddio-dashboard-section mb-8" aria-label={ar ? 'اختيارات لك' : 'Music picks'}>
      <div className="oddio-section-title-row flex-wrap gap-3">
        <div>
          <p className="oddio-micro-label">ODDIO PICKS</p>
          <h2>{personalized ? (ar ? 'مختارة على ذوقك' : 'Picked for your taste') :
            (ar ? 'ابدأ من هنا' : 'Start listening here')}</h2>
          <p className="text-sm text-muted">{personalized
            ? (ar ? 'حسب إعجاباتك واستماعك المكتمل.' : 'Inspired by your likes and completed listens.')
            : (ar ? 'اختيارات عامة لحد ما نعرف ذوقك.' : 'Popular picks while you find your sound.')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FlowButton tracks={visible} locale={locale} viewerId={viewerId} />
          <FlowButton kind="daily" locale={locale} viewerId={viewerId} />
          <FlowButton kind="weekly" locale={locale} viewerId={viewerId} />
        </div>
      </div>
      {cards.length ? (
        <div className="oddio-explore-results-grid grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((track) => (
            <div key={track.id} className="min-w-0">
              <TrackCard track={track} queue={visible} />
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  className="min-h-9 rounded-full border border-white/10 px-3 text-xs text-muted hover:text-ink"
                  onClick={() => update({
                    ...prefs,
                    trackIds: [...new Set([...prefs.trackIds, track.id])].slice(-100),
                  })}
                >
                  {ar ? 'مش مهتم' : 'Not interested'}
                </button>
                {track.genreId ? (
                  <button
                    type="button"
                    className="min-h-9 rounded-full border border-white/10 px-3 text-xs text-muted hover:text-ink"
                    onClick={() => update({
                      ...prefs,
                      genreIds: [...new Set([...prefs.genreIds, track.genreId])].slice(-50),
                    })}
                  >
                    {ar ? 'إخفاء النوع ده' : 'Hide this genre'}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">
          {ar ? 'مفيش اختيارات بعد الاستبعاد. تقدر تمسح الاستبعادات.'
            : 'No picks remain after filtering. Clear exclusions to start again.'}
        </p>
      )}
      {(prefs.trackIds.length > 0 || prefs.genreIds.length > 0) ? (
        <button
          type="button"
          className="mt-4 min-h-10 rounded-full border border-primary/40 px-4 text-sm text-primary"
          onClick={() => update({ trackIds: [], genreIds: [] })}
        >
          {ar ? 'مسح الاستبعادات' : 'Clear hidden music'}
        </button>
      ) : null}
    </section>
  );
}
