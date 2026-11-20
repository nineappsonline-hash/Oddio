'use client';

import { useEffect, useState } from 'react';
import { homePersonalizationKey, parseHomePersonalizationPreference } from '@/lib/home-personalization';
import { favoriteGenresKey, normalizeFavoriteGenres } from '@/lib/favorite-genres';
import type { CatalogTrack } from '@/lib/data/queries';
import { TrackCard } from '@/components/music/TrackCard';
import { FlowButton } from '@/components/player/FlowButton';
import { usePlayer } from '@/lib/player-store';
import {
  readDiscoveryExclusions,
  saveDiscoveryExclusions,
  hydrateDiscoveryExclusions,
  persistDiscoveryExclusions,
  type DiscoveryExclusions,
} from '@/lib/discovery-preferences';

export function DiscoveryMixShelf({
  tracks,
  publicTracks,
  genres,
  personalized,
  locale,
  viewerId,
}: {
  tracks: CatalogTrack[];
  publicTracks: CatalogTrack[];
  genres: Array<{ id: string; name: string }>;
  personalized: boolean;
  locale: 'ar' | 'en';
  viewerId: string | null;
}) {
  const ar = locale === 'ar';
  const [cloudSynced, setCloudSynced] = useState(false);
  const [personalizationEnabled, setPersonalizationEnabled] = useState(true);
  const [personalizationLoaded, setPersonalizationLoaded] = useState(false);
  const [favoriteGenreIds, setFavoriteGenreIds] = useState<string[]>([]);
  const [favoriteGenresLoaded, setFavoriteGenresLoaded] = useState(false);
  const [prefs, setPrefs] = useState<DiscoveryExclusions>({
    trackIds: [],
    genreIds: [],
  });
  useEffect(() => {
    setPersonalizationLoaded(false);
    if (!viewerId) {
      setPersonalizationEnabled(false);
      setPersonalizationLoaded(true);
      return;
    }
    try {
      setPersonalizationEnabled(
        parseHomePersonalizationPreference(window.localStorage.getItem(homePersonalizationKey(viewerId))),
      );
    } catch {
      setPersonalizationEnabled(true);
    }
    setPersonalizationLoaded(true);
  }, [viewerId]);

  useEffect(() => {
    setFavoriteGenresLoaded(false);
    if (!viewerId) {
      setFavoriteGenreIds([]);
      setFavoriteGenresLoaded(true);
      return;
    }
    try {
      setFavoriteGenreIds(
        normalizeFavoriteGenres(
          JSON.parse(window.localStorage.getItem(favoriteGenresKey(viewerId)) ?? '[]'),
          genres.map((genre) => genre.id),
        ),
      );
    } catch {
      setFavoriteGenreIds([]);
    }
    setFavoriteGenresLoaded(true);
  }, [viewerId, genres.map((genre) => genre.id).join('|')]);

  const updateFavoriteGenres = (next: string[]) => {
    if (!viewerId) return;
    const cleaned = normalizeFavoriteGenres(next, genres.map((genre) => genre.id));
    setFavoriteGenreIds(cleaned);
    try {
      window.localStorage.setItem(favoriteGenresKey(viewerId), JSON.stringify(cleaned));
    } catch {
      // Browsing should still work if device storage is blocked.
    }
  };

  const turnPersonalization = (enabled: boolean) => {
    if (!viewerId) return;
    setPersonalizationEnabled(enabled);
    try {
      window.localStorage.setItem(homePersonalizationKey(viewerId), enabled ? 'on' : 'off');
      window.dispatchEvent(new Event('oddio-home-personalization-changed'));
    } catch {
      // Continue with the current session setting when browser storage is unavailable.
    }
  };

  useEffect(() => {
    setPrefs(readDiscoveryExclusions(viewerId));
    let mounted = true;
    setCloudSynced(false);
    void hydrateDiscoveryExclusions(viewerId).then((available) => {
      if (mounted) setCloudSynced(available);
    });
    const refresh = () => setPrefs(readDiscoveryExclusions(viewerId));
    window.addEventListener('oddio-discovery-preferences-changed', refresh);
    return () => {
      mounted = false;
      window.removeEventListener('oddio-discovery-preferences-changed', refresh);
    };
  }, [viewerId]);
  function update(next: DiscoveryExclusions) {
    setPrefs(next);
    saveDiscoveryExclusions(viewerId, next);
    if (viewerId) {
      void persistDiscoveryExclusions(viewerId, next).then(setCloudSynced);
    }
    // Also remove newly hidden music from the active station queue.
    const state = usePlayer.getState();
    if (state.station) {
      usePlayer.setState({
        queue: state.queue.filter(
          (track) =>
            !next.trackIds.includes(track.id) &&
            !(track.genreIds?.length ? track.genreIds : [track.genreId]).some((id) =>
              next.genreIds.includes(id),
            ),
        ),
      });
    }
  }
  const showPersonalized = Boolean(viewerId && personalizationLoaded && personalized && personalizationEnabled);
  const generalPicks = favoriteGenresLoaded && viewerId && personalizationEnabled && favoriteGenreIds.length
    ? [...publicTracks].sort((a, b) => {
        const match = (track: CatalogTrack) =>
          (track.genreIds?.length ? track.genreIds : [track.genreId])
            .filter((id) => favoriteGenreIds.includes(id)).length;
        return match(b) - match(a);
      })
    : publicTracks;
  const sourceTracks = showPersonalized ? tracks : generalPicks;
  const visible = sourceTracks.filter(
    (track) =>
      !prefs.trackIds.includes(track.id) &&
      !(track.genreIds?.length ? track.genreIds : [track.genreId]).some((id) =>
        prefs.genreIds.includes(id),
      ),
  );
  const cards = visible.slice(0, 5);
  return (
    <section
      className="oddio-dashboard-section mb-8"
      aria-label={ar ? 'اختيارات لك' : 'Music picks'}
    >
      <div className="oddio-section-title-row flex-wrap gap-3">
        <div>
          <p className="oddio-micro-label">ODDIO PICKS</p>
          <h2>
            {showPersonalized
              ? ar
                ? 'مختارة على ذوقك'
                : 'Picked for your taste'
              : ar
                ? 'ابدأ من هنا'
                : 'Start listening here'}
          </h2>
          <p className="text-sm text-muted">
            {showPersonalized
              ? ar
                ? 'حسب إعجاباتك واستماعك المكتمل.'
                : 'Inspired by your likes and completed listens.'
              : ar
                ? 'اختيارات عامة لحد ما نعرف ذوقك.'
                : 'Popular picks while you find your sound.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FlowButton tracks={visible} locale={locale} viewerId={viewerId} localOnly={!personalizationLoaded || !personalizationEnabled} />
          {viewerId && personalizationLoaded && personalizationEnabled ? (
            <>
              <FlowButton kind="daily" locale={locale} viewerId={viewerId} />
              <FlowButton kind="weekly" locale={locale} viewerId={viewerId} />
            </>
          ) : null}
        </div>
      </div>
      {viewerId && personalizationLoaded ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">
              {ar ? 'اختيارات على ذوقك' : 'Personalized picks'}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              {personalizationEnabled
                ? ar
                  ? 'الاقتراحات بتعتمد على الأغاني اللي عجبتك والاستماع المكتمل. اقفلها لو تفضل اختيارات عامة.'
                  : 'Suggestions use your likes and completed listens. Turn them off to browse general picks.'
                : ar
                  ? 'بتشوف اختيارات عامة مش مبنية على نشاط استماعك.'
                  : 'You are seeing general picks, not based on your listening activity.'}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {ar
                ? 'الإعداد محفوظ على الجهاز ده. مش بيمسح سجل الاستماع.'
                : 'Saved on this device. This does not delete listening history.'}
            </p>
          </div>
          <button
            type="button"
            aria-pressed={personalizationEnabled}
            onClick={() => turnPersonalization(!personalizationEnabled)}
            className="min-h-11 shrink-0 rounded-full border border-primary/40 px-4 text-xs font-bold text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {personalizationEnabled
              ? ar ? 'إيقاف التخصيص' : 'Turn off'
              : ar ? 'تشغيل التخصيص' : 'Turn on'}
          </button>
        </div>
      ) : null}
      {viewerId && favoriteGenresLoaded && personalizationLoaded && personalizationEnabled && !personalized && genres.length > 0 ? (
        <div className="mb-4 space-y-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
          <div>
            <h3 className="text-sm font-bold text-ink">{ar ? 'اختار لحد 3 أنواع موسيقية بتحبها' : 'Pick up to 3 favorite genres'}</h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              {ar
                ? 'اختياري. هنقدم الأنواع اللي اخترتها في الترشيحات العامة. تقدر تغيرها أو تمسحها في أي وقت.'
                : 'Optional. We will prioritize these genres among general picks. Change or clear them anytime.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label={ar ? 'أنواعك المفضلة' : 'Favorite genres'}>
            {genres.slice(0, 24).map((genre) => {
              const selected = favoriteGenreIds.includes(genre.id);
              return (
                <button
                  key={genre.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={!selected && favoriteGenreIds.length >= 3}
                  onClick={() => updateFavoriteGenres(selected
                    ? favoriteGenreIds.filter((id) => id !== genre.id)
                    : [...favoriteGenreIds, genre.id])}
                  className={`min-h-11 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-35 ${selected ? 'border-primary/60 bg-primary/15 text-primary' : 'border-white/20 text-ink hover:bg-white/10'}`}
                >
                  {genre.name}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">{favoriteGenreIds.length}/3 · {ar ? 'محفوظة على الجهاز ده' : 'Saved on this device'}</p>
            {favoriteGenreIds.length > 0 ? (
              <button type="button" onClick={() => updateFavoriteGenres([])}
                className="min-h-11 rounded-lg px-3 text-xs font-semibold text-primary hover:bg-primary/10">
                {ar ? 'مسح الاختيارات' : 'Clear choices'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <p className="mb-3 text-xs text-muted" role="status">
        {viewerId
          ? cloudSynced
            ? ar
              ? 'اختيارات الاستبعاد متزامنة على حسابك.'
              : 'Hidden music synced to your account.'
            : ar
              ? 'الاستبعادات محفوظة على الجهاز ده حاليًا.'
              : 'Hidden music is currently saved on this device.'
          : ar
            ? 'الاستبعادات المؤقتة محفوظة في التبويب ده.'
            : 'Guest exclusions are saved in this tab.'}
      </p>
      {cards.length ? (
        <div className="oddio-explore-results-grid grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((track) => (
            <div key={track.id} className="min-w-0">
              <TrackCard track={track} queue={visible} />
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  className="min-h-9 rounded-full border border-white/10 px-3 text-xs text-muted hover:text-ink"
                  onClick={() =>
                    update({
                      ...prefs,
                      trackIds: [...new Set([...prefs.trackIds, track.id])].slice(-100),
                    })
                  }
                >
                  {ar ? 'مش مهتم' : 'Not interested'}
                </button>
                {track.genreId ? (
                  <button
                    type="button"
                    className="min-h-9 rounded-full border border-white/10 px-3 text-xs text-muted hover:text-ink"
                    onClick={() =>
                      update({
                        ...prefs,
                        genreIds: [...new Set([...prefs.genreIds, track.genreId])].slice(
                          -50,
                        ),
                      })
                    }
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
          {ar
            ? 'مفيش اختيارات بعد الاستبعاد. تقدر تمسح الاستبعادات.'
            : 'No picks remain after filtering. Clear exclusions to start again.'}
        </p>
      )}
      {prefs.trackIds.length > 0 || prefs.genreIds.length > 0 ? (
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
