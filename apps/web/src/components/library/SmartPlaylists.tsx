'use client';

import { useEffect, useMemo, useState } from 'react';
import { ApiClientError, apiRequest } from '@/lib/client-api';
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

const syncPath = '/api/library/smart-playlists';
type Version = string | null;
type SyncState = 'loading' | 'saving' | 'synced' | 'local' | 'conflict';
type AccountCopy = { updatedAt: Version; rules: SmartPlaylistRule[] };
type Pending = { updatedAt?: Version; rules: SmartPlaylistRule[] };

function rememberPending(key: string, pending: Pending): boolean {
  try {
    localStorage.setItem(key + ':pending', JSON.stringify(pending));
    return true;
  } catch {
    return false;
  }
}

function rememberSynced(key: string, rules: SmartPlaylistRule[]) {
  try {
    localStorage.setItem(key, JSON.stringify(rules));
    localStorage.removeItem(key + ':pending');
  } catch {
    // A later load can still reconcile the pending edit with the account.
  }
}

async function saveAccount(accountId: string, copy: AccountCopy) {
  return apiRequest<{ saved: boolean; updatedAt?: string }>(syncPath, {
    method: 'PUT',
    body: JSON.stringify({
      accountId,
      rules: copy.rules,
      expectedUpdatedAt: copy.updatedAt,
    }),
    signal: AbortSignal.timeout(8000),
  });
}

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
  const [syncState, setSyncState] = useState<SyncState>('loading');
  const [version, setVersion] = useState<Version | undefined>(undefined);
  const [conflict, setConflict] = useState<AccountCopy | null>(null);
  const [reload, setReload] = useState(0);
  const storageKey = smartPlaylistStorageKey(userId);
  const [form, setForm] = useState(blank);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const startFlow = usePlayer((state) => state.startFlow);
  const validGenres = useMemo(() => genres.map((item) => item.id), [genres]);
  const validMoods = useMemo(() => moods.map((item) => item.id), [moods]);
  const likeSet = useMemo(() => new Set(likedIds), [likedIds]);

  useEffect(() => {
    let cancelled = false;
    setSyncState('loading');
    setConflict(null);
    setVersion(undefined);
    setMessage('');
    const clean = (input: unknown) =>
      validateSmartPlaylistRules(input, validGenres, validMoods);
    let local: SmartPlaylistRule[] = [];
    let pending: Pending | undefined;
    try {
      local = clean(JSON.parse(localStorage.getItem(storageKey) ?? '[]'));
      const raw = localStorage.getItem(storageKey + ':pending');
      // Older builds saved the rules separately with a plain "1" marker.
      if (raw === '1') pending = { rules: local };
      else if (raw) {
        const previous = JSON.parse(raw) as Pending | null;
        if (Array.isArray(previous?.rules))
          pending = { ...previous, rules: clean(previous.rules) };
      }
    } catch {
      // Device storage is optional; signed-in account sync can still work.
    }
    const shown = pending?.rules ?? local;
    setVersion(pending?.updatedAt);
    setRules(shown);
    setActiveId(shown[0]?.id ?? null);

    void (async () => {
      try {
        const remote = await apiRequest<
          AccountCopy & { available: boolean; accountId?: string }
        >(syncPath, { signal: AbortSignal.timeout(8000) });
        if (cancelled) return;
        if (!remote.available || remote.accountId !== userId) {
          setSyncState('local');
          return;
        }
        const account = { updatedAt: remote.updatedAt, rules: clean(remote.rules) };
        const unsaved =
          pending ??
          (remote.updatedAt === null && local.length ? { rules: local } : undefined);
        if (unsaved && JSON.stringify(unsaved.rules) !== JSON.stringify(account.rules)) {
          if (
            unsaved.updatedAt !== account.updatedAt &&
            !(unsaved.updatedAt === undefined && account.updatedAt === null)
          ) {
            setConflict(account);
            setSyncState('conflict');
            return;
          }
          const saved = await saveAccount(userId, { ...account, rules: unsaved.rules });
          if (cancelled) return;
          if (!saved.saved || !saved.updatedAt) {
            setSyncState('local');
            return;
          }
          setVersion(saved.updatedAt);
          rememberSynced(storageKey, unsaved.rules);
        } else {
          setRules(account.rules);
          setActiveId(account.rules[0]?.id ?? null);
          setVersion(account.updatedAt);
          rememberSynced(storageKey, account.rules);
        }
        setSyncState('synced');
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiClientError && error.status === 409) {
          // Re-read the account copy for the conflict decision. No stale PUT is retried.
          setReload((value) => value + 1);
          return;
        }
        setSyncState('local');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, storageKey, validGenres, validMoods, reload]);

  const editingBlocked =
    syncState === 'loading' || syncState === 'saving' || syncState === 'conflict';

  const save = (next: SmartPlaylistRule[], base = version) => {
    const clean = validateSmartPlaylistRules(next, validGenres, validMoods);
    if (base === undefined && !rememberPending(storageKey, { rules: clean })) {
      setMessage(
        ar
          ? 'تعذر الحفظ على الجهاز. جرّب تاني لما الاتصال يرجع.'
          : 'Could not save on this device. Try again when you’re online.',
      );
      return false;
    }
    const keptLocally =
      base === undefined ||
      rememberPending(storageKey, { updatedAt: base, rules: clean });
    setRules(clean);
    setConflict(null);
    if (base === undefined) {
      setMessage(ar ? 'اتحفظت على الجهاز فقط.' : 'Saved on this device only.');
      return true;
    }
    setSyncState('saving');
    setMessage(ar ? 'جاري حفظ التغييرات…' : 'Saving changes…');
    void (async () => {
      try {
        const result = await saveAccount(userId, { updatedAt: base, rules: clean });
        if (!result.saved || !result.updatedAt) throw new Error('Account save failed');
        setVersion(result.updatedAt);
        rememberSynced(storageKey, clean);
        setSyncState('synced');
        setMessage(ar ? 'اتحفظت على حسابك.' : 'Saved to your account.');
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 409 && keptLocally) {
          setReload((value) => value + 1);
          return;
        }
        setSyncState('local');
        setMessage(
          keptLocally
            ? ar
              ? 'اتحفظت على الجهاز. هنحاول نزامنها لما تفتح المكتبة تاني.'
              : 'Saved on this device. Sync will retry when you revisit the library.'
            : ar
              ? 'التغييرات لسه ما اتحفظتش. سيب الصفحة مفتوحة وجرّب تاني.'
              : 'Changes haven’t been saved. Keep this page open and retry.',
        );
      }
    })();
    return true;
  };

  const add = () => {
    if (editingBlocked) return;
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
          : syncState === 'loading' || syncState === 'saving'
            ? ar
              ? 'جاري التحقق من المزامنة…'
              : 'Checking account sync…'
            : syncState === 'conflict'
              ? ar
                ? 'القوائم على الحساب اتغيّرت من جهاز تاني.'
                : 'Smart playlists changed on another device.'
              : ar
                ? 'المزامنة غير متاحة. بنستخدم النسخة المحلية.'
                : 'Account sync unavailable; using local rules.'}
      </p>
      {conflict ? (
        <div className="space-y-2 rounded-2xl border border-white/15 p-4 text-sm">
          <p>
            {ar
              ? 'اختار النسخة اللي عاوز تكمّل بيها. النسخة التانية مش هتفضل محفوظة.'
              : 'Choose which copy to keep. The other copy will be discarded.'}
          </p>
          <p className="break-words text-muted">
            {ar ? 'على الحساب:' : 'On your account:'}{' '}
            {conflict.rules.map((rule) => rule.title).join('، ') ||
              (ar ? 'مفيش قوائم' : 'No lists')}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-full border border-white/20 px-4"
              onClick={() => {
                setRules(conflict.rules);
                setActiveId(conflict.rules[0]?.id ?? null);
                setVersion(conflict.updatedAt);
                rememberSynced(storageKey, conflict.rules);
                setConflict(null);
                setSyncState('synced');
              }}
            >
              {ar ? 'احتفظ بنسخة الحساب' : 'Keep account copy'}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-full border border-white/20 px-4"
              onClick={() => save(rules, conflict.updatedAt)}
            >
              {ar ? 'استبدلها بنسخة الجهاز' : 'Replace with device copy'}
            </button>
          </div>
        </div>
      ) : null}
      {syncState === 'local' && version !== undefined ? (
        <button
          type="button"
          className="min-h-11 rounded-full border border-white/20 px-4 text-sm"
          onClick={() => save(rules)}
        >
          {ar ? 'جرّب المزامنة تاني' : 'Retry account sync'}
        </button>
      ) : null}
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
          disabled={editingBlocked}
          className="mt-4 min-h-11 rounded-full bg-primary px-5 text-sm font-bold text-[#211518] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
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
                    disabled={editingBlocked}
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
                    className="min-h-11 rounded-full border border-white/20 px-4 text-sm text-ink disabled:opacity-50"
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
