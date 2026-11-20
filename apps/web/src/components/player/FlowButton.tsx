'use client';

import { useState } from 'react';
import { Radio } from 'lucide-react';
import type { RadioDiscoveryMode } from '@/lib/data/discovery-mixes';
import type { CatalogTrack } from '@/lib/data/queries';
import { usePlayer, type StationMode } from '@/lib/player-store';
import {
  hydrateDiscoveryExclusions,
  readDiscoveryExclusions,
} from '@/lib/discovery-preferences';

export function FlowButton({
  tracks = [],
  locale,
  kind = 'flow',
  seedId,
  viewerId = null,
  localOnly = false,
}: {
  tracks?: CatalogTrack[];
  locale: 'ar' | 'en';
  kind?: StationMode;
  seedId?: string;
  viewerId?: string | null;
  /** Start only the supplied curated track list; do not call personalized mix API. */
  localOnly?: boolean;
}) {
  const startFlow = usePlayer((state) => state.startFlow);
  const [busy, setBusy] = useState(false);
  const [radioMode, setRadioMode] = useState<RadioDiscoveryMode>('balanced');
  const canTuneRadio = kind === 'song' || kind === 'artist';
  const [failed, setFailed] = useState(false);
  const ar = locale === 'ar';
  const titles = {
    flow: ar ? 'شغّل Oddio Flow' : 'Start Oddio Flow',
    daily: ar ? 'شغّل Daily Mix' : 'Play Daily Mix',
    weekly: ar ? 'شغّل Discover Weekly' : 'Play Discover Weekly',
    song: ar ? 'راديو الأغنية' : 'Song Radio',
    artist: ar ? 'راديو الفنان' : 'Artist Radio',
    genre: ar ? 'راديو النوع الموسيقي' : 'Genre Radio',
    mood: ar ? 'راديو المود' : 'Mood Radio',
  } as const;
  async function start() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await hydrateDiscoveryExclusions(viewerId);
      const hidden = readDiscoveryExclusions(viewerId);
      if (localOnly) {
        const fallback = tracks.filter(
          (item) =>
            !hidden.trackIds.includes(item.id) &&
            !(item.genreIds?.length ? item.genreIds : [item.genreId]).some((id) =>
              hidden.genreIds.includes(id),
            ),
        );
        if (!fallback.length) throw new Error('No playable music available');
        startFlow(fallback, { kind, ...(seedId ? { seedId } : {}) });
        return;
      }
      const params = new URLSearchParams({ kind });
      if (seedId) params.set('seed', seedId);
      if (canTuneRadio) params.set('radioMode', radioMode);
      if (hidden.trackIds.length) params.set('exclude', hidden.trackIds.join(','));
      if (hidden.genreIds.length) params.set('blockedGenres', hidden.genreIds.join(','));
      const response = await fetch('/api/discovery/mix?' + params.toString(), {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Mix unavailable');
      const payload: unknown = await response.json();
      const data = payload as {
        tracks?: CatalogTrack[];
        data?: { tracks?: CatalogTrack[] };
      };
      const recommended = data.data?.tracks ?? data.tracks;
      if (!Array.isArray(recommended) || recommended.length === 0)
        throw new Error('No playable music available');
      startFlow(recommended, { kind, ...(seedId ? { seedId } : {}) });
    } catch {
      // The original server-rendered Flow list is a backup for transient API failures.
      const hidden = readDiscoveryExclusions(viewerId);
      const fallback = tracks.filter(
        (item) =>
          !hidden.trackIds.includes(item.id) &&
          !(item.genreIds?.length ? item.genreIds : [item.genreId]).some((id) =>
            hidden.genreIds.includes(id),
          ),
      );
      if (fallback.length) startFlow(fallback, { kind, ...(seedId ? { seedId } : {}) });
      else setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex max-w-full flex-col items-start gap-2">
      {canTuneRadio ? (
        <label className="flex max-w-full flex-wrap items-center gap-2 text-xs font-semibold text-muted">
          <span>{ar ? 'درجة الاكتشاف' : 'Discovery range'}</span>
          <select
            value={radioMode}
            onChange={(event) => setRadioMode(event.target.value as RadioDiscoveryMode)}
            disabled={busy}
            className="min-h-11 max-w-full rounded-lg border border-white/20 bg-surface px-3 text-xs text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            aria-label={ar ? 'مدى تنوع أغاني الراديو' : 'Radio discovery range'}
          >
            <option value="familiar">{ar ? 'قريب من ذوقك' : 'Stay close'}</option>
            <option value="balanced">{ar ? 'متوازن' : 'Balanced'}</option>
            <option value="explore">{ar ? 'اكتشف أكتر' : 'Explore more'}</option>
          </select>
        </label>
      ) : null}
      <button
        type="button"
        onClick={() => void start()}
        disabled={busy}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-primary/50 bg-primary/15 px-5 py-2 text-sm font-semibold text-ink transition hover:bg-primary/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        aria-label={titles[kind]}
      >
        <Radio size={18} aria-hidden="true" />
        {busy ? (ar ? 'جاري التحضير…' : 'Preparing…') : titles[kind]}
      </button>
      {failed ? (
        <span role="status" className="text-xs text-muted">
          {ar
            ? 'مفيش أغاني مناسبة متاحة حاليًا.'
            : 'No matching playable tracks right now.'}
        </span>
      ) : null}
    </span>
  );
}
