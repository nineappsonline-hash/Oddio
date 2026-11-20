'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '@/lib/client-api';
import type { CatalogTrack } from '@/lib/data/queries';
import { TrackRow } from '@/components/music/TrackRow';
import { usePlayer } from '@/lib/player-store';
import {
  evaluateSmartPlaylist,
  smartPlaylistStorageKey,
  validateSmartPlaylistRules,
  type SmartPlaylistRule,
} from '@/lib/smart-playlists';

type Option = { id: string; name: string };
const blank = { title: '', genreId: '', moodId: '', likedOnly: false };

export function SmartPlaylists({
  userId,
  locale,
  catalog,
  likedIds,
  genres,
  moods,
}: {
  userId: string;
  locale: 'ar' | 'en';
  catalog: CatalogTrack[];
  likedIds: string[];
  genres: Option[];
  moods: Option[];
}) {
  const ar = locale === 'ar';
  const [rules, setRules] = useState<SmartPlaylistRule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncState, setSyncState] = useState<'loading' | 'synced' | 'local'>('loading');
  const modifiedDuringLoad = useRef(false);
  const syncSequence = useRef<Promise<unknown>>(Promise.resolve());
  const revision = useRef(0);
  const [form, setForm] = useState(blank);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const startFlow = usePlayer((state) => state.startFlow);
  const validGenres = useMemo(() => genres.map((item) => item.id), [genres]);
  const validMoods = useMemo(() => moods.map((item) => item.id), [moods]);
  const likeSet = useMemo(() => new Set(likedIds), [likedIds]);

  useEffect(() => {
    let cancelled = false;
    modifiedDuringLoad.current = false;
    setLoaded(false);
    setSyncState('loading');
    let local: SmartPlaylistRule[] = [];
    try {
      const raw = window.localStorage.getItem(smartPlaylistStorageKey(userId));
      const parsed: unknown = JSON.parse(raw ?? '[]');
      local = validateSmartPlaylistRules(parsed, validGenres, validMoods);
    } catch {
      // Continue without device storage.
    }
    setRules(local);
    setActiveId(local[0]?.id ?? null);
    setLoaded(true);
    void (async () => {
      try {
        const remote = await apiRequest<{
          available: boolean;
          hasSavedState?: boolean;
          rules: SmartPlaylistRule[];
        }>('/api/library/smart-playlists');
        if (cancelled || modifiedDuringLoad.current) return;
        if (!remote.available) {
          setSyncState('local');
          return;
        }
        let pendingLocalSave = false;
        try {
          pendingLocalSave =
            window.localStorage.getItem(smartPlaylistStorageKey(userId) + ':pending') ===
            '1';
        } catch {
          /* Sync can still work without storage. */
        }
        if (pendingLocalSave || (!remote.hasSavedState && local.length > 0)) {
          const result = await apiRequest<{ saved: boolean }>(
            '/api/library/smart-playlists',
            {
              method: 'PUT',
              body: JSON.stringify({ rules: local }),
            },
          );
          if (!cancelled) {
            if (result.saved) {
              try {
                window.localStorage.removeItem(
                  smartPlaylistStorageKey(userId) + ':pending',
                );
              } catch {}
            }
            setSyncState(result.saved ? 'synced' : 'local');
          }
          return;
        }
        const saved = validateSmartPlaylistRules(remote.rules, validGenres, validMoods);
        if (cancelled || modifiedDuringLoad.current) return;
        setRules(saved);
        setActiveId(saved[0]?.id ?? null);
        try {
          window.localStorage.setItem(
            smartPlaylistStorageKey(userId),
            JSON.stringify(saved),
          );
        } catch {
          /* Account copy remains authoritative. */
        }
        setSyncState('synced');
      } catch {
        if (!cancelled) setSyncState('local');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, validGenres, validMoods]);

  const save = (next: SmartPlaylistRule[]) => {
    const clean = validateSmartPlaylistRules(next, validGenres, validMoods);
    modifiedDuringLoad.current = true;
    setRules(clean);
    try {
      window.localStorage.setItem(smartPlaylistStorageKey(userId), JSON.stringify(clean));
    } catch {
      // Still attempt to persist to the signed-in account.
    }
    try {
      window.localStorage.setItem(smartPlaylistStorageKey(userId) + ':pending', '1');
    } catch {}
    const thisRevision = ++revision.current;
    setSyncState('loading');
    setMessage(ar ? 'جاري حفظ التغييرات…' : 'Saving changes…');
    // Writes are serialized so a slower earlier request cannot undo a
    // newer save or resurrect a deleted playlist on the account.
    syncSequence.current = syncSequence.current
      .catch(() => undefined)
      .then(async () => {
        try {
          const result = await apiRequest<{ saved: boolean }>(
            '/api/library/smart-playlists',
            {
              method: 'PUT',
              body: JSON.stringify({ rules: clean }),
            },
          );
          if (thisRevision !== revision.current) return;
          if (result.saved) {
            try {
              window.localStorage.removeItem(
                smartPlaylistStorageKey(userId) + ':pending',
              );
            } catch {}
          }
          setSyncState(result.saved ? 'synced' : 'local');
          setMessage(
            result.saved
              ? ar
                ? 'اتحفظت على حسابك.'
                : 'Saved to your account.'
              : ar
                ? 'اتحفظت على الجهاز فقط.'
                : 'Saved on this device only.',
          );
        } catch {
          if (thisRevision !== revision.current) return;
          setSyncState('local');
          setMessage(
            ar
              ? 'المزامنة غير متاحة. التغييرات المحلية هتتجرّب تاني لما تفتح المكتبة.'
              : 'Sync unavailable. Local changes will retry when you revisit the library.',
          );
        }
      });
    return true;
  };

  const add = () => {
    if (
      !form.title.trim() ||
      rules.length >= 12 ||
      (!form.genreId && !form.moodId && !form.likedOnly)
    ) {
      setMessage(
        ar
          ? 'اكتب اسم واختار شرط واحد على الأقل (الحد 12 قائمة).'
          : 'Enter a name and at least one rule (maximum 12 lists).',
      );
      return;
    }
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Date.now().toString(36) + '-' + Math.floor(Math.random() * 100000).toString(36);
    const next = [...rules, { id, ...form, title: form.title.trim().slice(0, 70) }];
    if (save(next)) {
      setActiveId(id);
      setForm(blank);
    }
  };

  const selected = rules.find((item) => item.id === activeId) ?? rules[0];
  const matches = selected ? evaluateSmartPlaylist(catalog, selected, likeSet) : [];
  if (!loaded) {
    return (
      <p className="text-sm text-muted" role="status">
        {ar ? 'جاري تحميل قوائمك الذكية…' : 'Loading smart playlists…'}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-6 text-muted">
        {ar
          ? 'كوّن قائمة بتتحدث حسب النوع والمود والإعجابات. هنحفظ القواعد على حسابك لما المزامنة تكون متاحة، مع نسخة على الجهاز. القوائم مش عامة.'
          : 'Create dynamic selections by genre, mood, and likes. Rules sync to your account when available, with an on-device copy. These playlists are private.'}
      </p>
      <p className="text-xs text-muted" role="status">
        {syncState === 'synced'
          ? ar
            ? 'القواعد متزامنة مع حسابك.'
            : 'Rules synced to your account.'
          : syncState === 'loading'
            ? ar
              ? 'جاري التحقق من المزامنة…'
              : 'Checking account sync…'
            : ar
              ? 'المزامنة غير متاحة. بنستخدم النسخة المحلية.'
              : 'Account sync unavailable; using local rules.'}
      </p>
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <h3 className="mb-3 text-sm font-bold text-ink">
          {ar ? 'قائمة ذكية جديدة' : 'New smart playlist'}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted">
            {ar ? 'اسم القائمة' : 'Playlist name'}
            <input
              value={form.title}
              maxLength={70}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              className="input mt-2 h-11"
              placeholder={ar ? 'مثلاً: أغاني هادية' : 'E.g. Late-night favorites'}
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            {ar ? 'النوع الموسيقي' : 'Genre'}
            <select
              value={form.genreId}
              onChange={(event) =>
                setForm((current) => ({ ...current, genreId: event.target.value }))
              }
              className="input mt-2 h-11"
            >
              <option value="">{ar ? 'كل الأنواع' : 'Any genre'}</option>
              {genres.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            {ar ? 'المود' : 'Mood'}
            <select
              value={form.moodId}
              onChange={(event) =>
                setForm((current) => ({ ...current, moodId: event.target.value }))
              }
              className="input mt-2 h-11"
            >
              <option value="">{ar ? 'كل المودات' : 'Any mood'}</option>
              {moods.map((mood) => (
                <option key={mood.id} value={mood.id}>
                  {mood.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 self-end text-sm text-ink">
            <input
              type="checkbox"
              checked={form.likedOnly}
              onChange={(event) =>
                setForm((current) => ({ ...current, likedOnly: event.target.checked }))
              }
            />
            {ar ? 'الأغاني اللي عملت لها إعجاب فقط' : 'Only songs I liked'}
          </label>
        </div>
        <button
          type="button"
          onClick={add}
          className="mt-4 min-h-11 rounded-full bg-primary px-5 text-sm font-bold text-[#211518] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {ar ? 'احفظ القائمة الذكية' : 'Save smart playlist'}
        </button>
        {message ? (
          <p role="status" className="mt-2 text-xs text-muted">
            {message}
          </p>
        ) : null}
      </div>
      {rules.length > 0 ? (
        <>
          <nav
            aria-label={ar ? 'القوائم الذكية المحفوظة' : 'Saved smart playlists'}
            className="flex flex-wrap gap-2"
          >
            {rules.map((rule) => (
              <button
                key={rule.id}
                type="button"
                aria-pressed={selected?.id === rule.id}
                onClick={() => setActiveId(rule.id)}
                className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${selected?.id === rule.id ? 'border-primary/70 bg-primary/15 text-primary' : 'border-white/15 text-ink'}`}
              >
                {rule.title}
              </button>
            ))}
          </nav>
          {selected ? (
            <div className="rounded-2xl border border-white/10 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-ink" dir="auto">
                    {selected.title}
                  </h3>
                  <p className="text-xs text-muted">
                    {matches.length}{' '}
                    {ar ? 'أغنية متاحة (حد أقصى 80)' : 'available tracks (up to 80)'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!matches.length}
                    onClick={() => startFlow(matches)}
                    className="min-h-11 rounded-full bg-primary px-4 text-sm font-bold text-[#211518] disabled:opacity-50"
                  >
                    {ar ? 'شغّل القائمة' : 'Play selection'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !window.confirm(
                          ar ? 'تمسح القائمة الذكية دي؟' : 'Delete this smart playlist?',
                        )
                      )
                        return;
                      const next = rules.filter((rule) => rule.id !== selected.id);
                      if (save(next)) setActiveId(next[0]?.id ?? null);
                    }}
                    className="min-h-11 rounded-full border border-white/20 px-4 text-sm text-ink"
                  >
                    {ar ? 'حذف' : 'Delete'}
                  </button>
                </div>
              </div>
              {matches.length ? (
                <div className="divide-y divide-white/5">
                  {matches.map((track, index) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      queue={matches}
                      index={index}
                      locale={locale}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">
                  {ar
                    ? 'مفيش أغاني مطابقة حاليًا. جرّب شروط مختلفة.'
                    : 'No matching tracks right now. Try different rules.'}
                </p>
              )}
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted">
          {ar ? 'لسه ما عملتش قوائم ذكية.' : 'No smart playlists yet.'}
        </p>
      )}
    </div>
  );
}
