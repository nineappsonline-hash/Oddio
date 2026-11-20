'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, Search, X } from 'lucide-react';
import { addRecentMusicSearch, sanitizeRecentMusicSearches, MAX_MUSIC_QUERY_LENGTH } from '@/lib/recent-music-searches';

export function SearchExperience({
  locale,
  initialQuery,
  userId,
  placeholder,
  searchLabel,
}: {
  locale: 'ar' | 'en';
  initialQuery: string;
  userId: string | null;
  placeholder: string;
  searchLabel: string;
}) {
  const router = useRouter();
  const ar = locale === 'ar';
  const inputRef = useRef<HTMLInputElement>(null);
  const storageKey = `oddio-recent-searches:${userId || 'guest'}`;
  const [query, setQuery] = useState(initialQuery);
  const [recent, setRecent] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => { setQuery(initialQuery); }, [initialQuery]);

  useEffect(() => {
    const store = userId ? window.localStorage : window.sessionStorage;
    try {
      const saved: unknown = JSON.parse(store.getItem(storageKey) ?? '[]');
      setRecent(sanitizeRecentMusicSearches(saved));
    } catch {
      setRecent([]);
    }
    setReady(true);
  }, [storageKey, userId]);

  // Slash focuses search unless a user is already typing in an editable field.
  // Escape returns focus to the page. Cmd/Ctrl+K is also supported.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest('input,textarea,select,[contenteditable="true"]');
      if ((event.key === '/' && !typing && !event.altKey && !event.ctrlKey && !event.metaKey) ||
          ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault();
        inputRef.current?.focus();
      } else if (event.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const saveRecent = (value: string) => {
    const clean = value.trim().slice(0, MAX_MUSIC_QUERY_LENGTH);
    if (!clean) return;
    const next = addRecentMusicSearch(clean, recent);
    setRecent(next);
    try {
      (userId ? window.localStorage : window.sessionStorage).setItem(storageKey, JSON.stringify(next));
    } catch {
      // A browser that blocks storage should not block search.
    }
  };

  const openSearch = (value: string) => {
    const clean = value.trim().slice(0, MAX_MUSIC_QUERY_LENGTH);
    if (!clean) return;
    saveRecent(clean);
    router.push(`/${locale}/search?q=${encodeURIComponent(clean)}`);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    openSearch(query);
  };

  const removeRecent = (value: string) => {
    const next = recent.filter((item) => item !== value);
    setRecent(next);
    try {
      (userId ? window.localStorage : window.sessionStorage).setItem(storageKey, JSON.stringify(next));
    } catch {
      // Optional storage.
    }
  };

  return (
    <section aria-label={searchLabel} className="mb-8 space-y-3">
      <form role="search" onSubmit={submit} className="oddio-search-form flex gap-2">
        <input
          ref={inputRef}
          type="search"
          name="q"
          maxLength={MAX_MUSIC_QUERY_LENGTH}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label={searchLabel}
          className="input oddio-search-input h-12 min-w-0 flex-1 text-base"
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="oddio-search-submit flex h-12 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-[#211518] hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-40 sm:px-6"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          {ar ? 'بحث' : 'Search'}
        </button>
      </form>
      <p className="text-xs text-muted">
        {ar ? 'اضغط / علشان تبدأ بحث، أو Ctrl+K' : 'Press / or Ctrl+K to focus search'}
      </p>
      {ready && recent.length > 0 ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-xs font-semibold text-muted">
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              {ar ? 'عمليات البحث الأخيرة' : 'Recent searches'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setRecent([]);
                try { (userId ? window.localStorage : window.sessionStorage).removeItem(storageKey); } catch { /* optional */ }
              }}
              className="min-h-9 rounded-lg px-2 text-xs text-muted hover:text-ink"
            >
              {ar ? 'مسح السجل' : 'Clear history'}
            </button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {recent.map((item) => (
              <li key={item} className="inline-flex min-w-0 items-center overflow-hidden rounded-full border border-white/15 bg-white/5">
                <button type="button" onClick={() => { setQuery(item); openSearch(item); }}
                  className="min-h-10 max-w-[200px] truncate px-3 text-xs font-medium text-ink hover:text-primary"
                  title={item}>
                  {item}
                </button>
                <button type="button" onClick={() => removeRecent(item)}
                  aria-label={ar ? `امسح بحث ${item}` : `Remove search ${item}`}
                  className="grid h-10 w-9 place-items-center text-muted hover:text-ink">
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
