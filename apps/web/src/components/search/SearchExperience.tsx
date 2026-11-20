'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/client-api';
import { nextSuggestionFocusIndex } from '@/lib/suggestion-keyboard';
import { Clock3, Search, X } from 'lucide-react';
import { addRecentMusicSearch, sanitizeRecentMusicSearches, MAX_MUSIC_QUERY_LENGTH } from '@/lib/recent-music-searches';

type SuggestionTrack = { id: string; title: string; slug: string; artistName: string };
type SuggestionArtist = { id: string; name: string; slug: string };
type Suggestions = { tracks: SuggestionTrack[]; artists: SuggestionArtist[] };

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
  const suggestionRef = useRef<HTMLDivElement>(null);
  const storageKey = `oddio-recent-searches:${userId || 'guest'}`;
  const [query, setQuery] = useState(initialQuery);
  const [recent, setRecent] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions>({ tracks: [], artists: [] });
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState(false);

  const suggestionLinks = () => Array.from(
    suggestionRef.current?.querySelectorAll<HTMLAnchorElement>('a[data-suggestion-link]') ?? [],
  );

  const onSuggestionKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setFocused(false);
      inputRef.current?.blur();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const links = suggestionLinks();
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (index < 0) return;
    event.preventDefault();
    const next = nextSuggestionFocusIndex(index, event.key === 'ArrowDown' ? 'down' : 'up', links.length);
    if (next < 0) inputRef.current?.focus();
    else links[next]?.focus();
  };

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

  useEffect(() => {
    if (!focused || query.trim().length < 2) {
      setSuggestions({ tracks: [], artists: [] });
      setSuggestionLoading(false);
      setSuggestionError(false);
      return;
    }
    const controller = new AbortController();
    setSuggestionLoading(true);
    setSuggestionError(false);
    const timer = window.setTimeout(() => {
      apiRequest<Suggestions>(
        `/api/search/suggestions?q=${encodeURIComponent(query.trim())}`,
        { signal: controller.signal },
      )
        .then((items) => { if (!controller.signal.aborted) setSuggestions(items); })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions({ tracks: [], artists: [] });
            setSuggestionError(true);
          }
        })
        .finally(() => { if (!controller.signal.aborted) setSuggestionLoading(false); });
    }, 260);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, focused]);

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
        setFocused(false);
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
    setFocused(false);
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
    <section aria-label={searchLabel} dir={ar ? "rtl" : "ltr"} className="mb-8 min-w-0 space-y-3">
      <form role="search" onSubmit={submit} className="oddio-search-form flex min-w-0 gap-2">
        <input
          ref={inputRef}
          type="search"
          name="q"
          maxLength={MAX_MUSIC_QUERY_LENGTH}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            const next = event.relatedTarget as Node | null;
            if (suggestionRef.current?.contains(next)) return;
            // On mobile, focusing an anchor may briefly report relatedTarget=null.
            // Give taps time to activate before dismissing the suggestions.
            window.setTimeout(() => {
              const active = document.activeElement;
              if (active !== inputRef.current && !suggestionRef.current?.contains(active)) {
                setFocused(false);
              }
            }, 180);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') { setFocused(false); inputRef.current?.blur(); }
            if (event.key === 'ArrowDown' && suggestionLinks().length > 0) {
              event.preventDefault();
              suggestionLinks()[0]?.focus();
            }
          }}
          placeholder={placeholder}
          aria-label={searchLabel}
          className="input oddio-search-input h-12 min-w-0 flex-1 text-base"
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="oddio-search-submit flex h-12 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-[#211518] hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-40 sm:px-6"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          {ar ? 'بحث' : 'Search'}
        </button>
      </form>
      {focused && query.trim().length >= 2 ? (
        <div
          ref={suggestionRef}
          onKeyDown={onSuggestionKeys}
          onBlurCapture={(event) => {
            const next = event.relatedTarget as Node | null;
            if (event.currentTarget.contains(next) || next === inputRef.current) return;
            window.setTimeout(() => {
              const active = document.activeElement;
              if (active !== inputRef.current && !suggestionRef.current?.contains(active)) {
                setFocused(false);
              }
            }, 180);
          }}
          aria-label={ar ? 'اقتراحات البحث' : 'Search suggestions'}
          className="max-h-[min(55dvh,400px)] min-w-0 overflow-y-auto overscroll-contain rounded-2xl border border-white/15 bg-[#1d1827] p-2 shadow-xl sm:p-3"
        >
          {suggestionLoading ? (
            <p role="status" className="px-2 py-3 text-xs text-muted">{ar ? 'بندور على نتائج…' : 'Finding matches…'}</p>
          ) : suggestionError ? (
            <p role="status" className="px-2 py-3 text-xs text-muted">{ar ? 'الاقتراحات مش متاحة حاليًا. تقدر تبحث بالطريقة العادية.' : 'Suggestions unavailable. You can still search normally.'}</p>
          ) : suggestions.tracks.length === 0 && suggestions.artists.length === 0 ? (
            <p role="status" className="px-2 py-3 text-xs text-muted">{ar ? 'مفيش اقتراحات مطابقة.' : 'No matching suggestions.'}</p>
          ) : (
            <div className="space-y-3">
              {suggestions.tracks.length > 0 ? (
                <div>
                  <h2 className="mb-1 px-2 text-xs font-semibold text-muted">{ar ? 'أغاني' : 'Tracks'}</h2>
                  <ul>
                    {suggestions.tracks.map((track) => (
                      <li key={track.id}>
                        <Link
                          href={`/${locale}/tracks/${track.id}-${track.slug}`}
                          data-suggestion-link
                          onClick={() => { saveRecent(query); setFocused(false); }}
                          className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          <span className="min-w-0 truncate font-semibold">{track.title}</span>
                          <span className="max-w-[35%] shrink-0 truncate text-xs text-muted">{track.artistName}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {suggestions.artists.length > 0 ? (
                <div>
                  <h2 className="mb-1 px-2 text-xs font-semibold text-muted">{ar ? 'فنانين' : 'Artists'}</h2>
                  <ul>
                    {suggestions.artists.map((artist) => (
                      <li key={artist.id}>
                        <Link
                          href={`/${locale}/artists/${artist.slug}`}
                          data-suggestion-link
                          onClick={() => { saveRecent(query); setFocused(false); }}
                          className="block min-h-11 rounded-lg px-3 py-2 text-sm text-ink hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          {artist.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => openSearch(query)}
            className="mt-2 min-h-11 w-full rounded-xl border border-primary/30 px-3 text-start text-xs font-semibold text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            {ar ? `عرض كل نتائج «${query.trim()}»` : `See all results for “${query.trim()}”`}
          </button>
        </div>
      ) : null}
      <p className="text-xs text-muted">
        {ar ? 'اضغط / أو Ctrl+K للبحث، واستخدم الأسهم للتنقل بين الاقتراحات.' : 'Press / or Ctrl+K to search. Use arrow keys to navigate suggestions.'}
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
