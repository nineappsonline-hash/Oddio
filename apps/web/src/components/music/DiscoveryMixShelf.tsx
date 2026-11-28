'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Ellipsis } from 'lucide-react';
import {
  homePersonalizationKey,
  parseHomePersonalizationPreference,
} from '@/lib/home-personalization';
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

function DiscoveryTrackActions({
  title,
  ar,
  open,
  onToggle,
  onDismiss,
  onHideTrack,
  onHideGenre,
}: {
  title: string;
  ar: boolean;
  open: boolean;
  onToggle: () => void;
  onDismiss: () => void;
  onHideTrack: () => void;
  onHideGenre?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onOutside(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) onDismiss();
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      onDismiss();
      trigger.current?.focus();
    }
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open, onDismiss]);

  const actionClass =
    'min-h-11 w-full rounded-lg px-3 py-2 text-start text-sm text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary';

  return (
    <div
      ref={ref}
      className={open ? 'absolute end-3 top-3 z-30' : 'absolute end-3 top-3 z-20'}
    >
      <button
        ref={trigger}
        data-discovery-options
        type="button"
        aria-label={ar ? 'اختيارات ' + title : 'Options for ' + title}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={onToggle}
        className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/75 text-white shadow-md backdrop-blur-sm hover:bg-black/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Ellipsis size={20} aria-hidden="true" />
      </button>
      {open ? (
        <div
          id={panelId}
          className="absolute end-0 top-full mt-1 w-44 max-w-[calc((100vw-4rem)/2)] rounded-xl sm:max-w-none border border-white/15 bg-[#202829] p-1 shadow-xl"
        >
          <button type="button" className={actionClass} onClick={onHideTrack}>
            {ar ? 'مش مهتم' : 'Not interested'}
          </button>
          {onHideGenre ? (
            <button type="button" className={actionClass} onClick={onHideGenre}>
              {ar ? 'إخفاء النوع ده' : 'Hide this genre'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

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
  const [openOptionsId, setOpenOptionsId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const dismissOptions = () => setOpenOptionsId(null);
  const applyExclusion = (next: DiscoveryExclusions) => {
    dismissOptions();
    update(next);
    requestAnimationFrame(() => {
      (
        gridRef.current?.querySelector<HTMLButtonElement>('[data-discovery-options]') ??
        clearRef.current
      )?.focus({ preventScroll: true });
    });
  };
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
        parseHomePersonalizationPreference(
          window.localStorage.getItem(homePersonalizationKey(viewerId)),
        ),
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

  useEffect(() => {
    if (!viewerId) return;
    const refresh = () => {
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
    };
    window.addEventListener('oddio-favorite-genres-changed', refresh);
    return () => window.removeEventListener('oddio-favorite-genres-changed', refresh);
  }, [viewerId, genres]);

  const turnPersonalization = (enabled: boolean) => {
    if (!viewerId) return;
    setPersonalizationEnabled(enabled);
    try {
      window.localStorage.setItem(
        homePersonalizationKey(viewerId),
        enabled ? 'on' : 'off',
      );
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
  const showPersonalized = Boolean(
    viewerId && personalizationLoaded && personalized && personalizationEnabled,
  );
  const generalPicks =
    favoriteGenresLoaded && viewerId && personalizationEnabled && favoriteGenreIds.length
      ? [...publicTracks].sort((a, b) => {
          const match = (track: CatalogTrack) =>
            (track.genreIds?.length ? track.genreIds : [track.genreId]).filter((id) =>
              favoriteGenreIds.includes(id),
            ).length;
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
          <FlowButton
            tracks={visible}
            locale={locale}
            viewerId={viewerId}
            localOnly={!personalizationLoaded || !personalizationEnabled}
          />
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
              ? ar
                ? 'إيقاف التخصيص'
                : 'Turn off'
              : ar
                ? 'تشغيل التخصيص'
                : 'Turn on'}
          </button>
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
        <div
          ref={gridRef}
          className="oddio-explore-results-grid grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
        >
          {cards.map((track) => (
            <div key={track.id} className="relative min-w-0" data-discovery-track>
              <TrackCard track={track} queue={visible} />
              <DiscoveryTrackActions
                title={track.title}
                ar={ar}
                open={openOptionsId === track.id}
                onToggle={() =>
                  setOpenOptionsId((id) => (id === track.id ? null : track.id))
                }
                onDismiss={dismissOptions}
                onHideTrack={() =>
                  applyExclusion({
                    ...prefs,
                    trackIds: [...new Set([...prefs.trackIds, track.id])].slice(-100),
                  })
                }
                onHideGenre={
                  track.genreId
                    ? () =>
                        applyExclusion({
                          ...prefs,
                          genreIds: [
                            ...new Set([...prefs.genreIds, track.genreId]),
                          ].slice(-50),
                        })
                    : undefined
                }
              />
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
          ref={clearRef}
          className="mt-4 min-h-10 rounded-full border border-primary/40 px-4 text-sm text-primary"
          onClick={() => update({ trackIds: [], genreIds: [] })}
        >
          {ar ? 'مسح الاستبعادات' : 'Clear hidden music'}
        </button>
      ) : null}
    </section>
  );
}
