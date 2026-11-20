'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pin } from 'lucide-react';
import type { Playlist } from '@ai-music/contracts';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { DragReorderList } from '@/components/ui/DragReorderList';
import { moveItem } from '@/lib/reorder-items';

/** Playlist shelves are user-personalized. This ordering is saved in this
 * browser, without modifying other listeners' public playlist rankings. */
export function ReorderablePlaylistGrid({
  playlists,
  locale,
  userId,
  section = 'owned',
}: {
  playlists: Playlist[];
  locale: 'ar' | 'en';
  userId: string;
  section?: 'owned' | 'followed';
}) {
  const [items, setItems] = useState(playlists);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'custom' | 'title' | 'recent'>('custom');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [pinned, setPinned] = useState<string[]>([]);
  const key = `oddio-library-playlist-order:${userId}:${section}`;
  const displayKey = `oddio-library-playlist-view:${userId}:${section}`;
  const pinKey = `oddio-library-playlist-pins:${userId}:${section}`;

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem(pinKey) ?? '[]');
      setPinned(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []);
    } catch {
      setPinned([]);
    }
  }, [pinKey]);

  const togglePin = (id: string) => {
    const next = pinned.includes(id) ? pinned.filter((item) => item !== id) : [...pinned, id];
    setPinned(next);
    try { window.localStorage.setItem(pinKey, JSON.stringify(next)); } catch { /* Optional preference. */ }
  };

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(displayKey);
      if (saved === 'list' || saved === 'grid') setView(saved);
    } catch {
      // View preferences are optional.
    }
  }, [displayKey]);

  const shown = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const filtered = items.filter((playlist) =>
      !needle || `${playlist.title} ${playlist.description} ${playlist.ownerName}`.toLocaleLowerCase().includes(needle),
    );
    const ordered = [...filtered];
    if (sort === 'title') ordered.sort((a, b) => a.title.localeCompare(b.title, locale));
    if (sort === 'recent') ordered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return ordered.sort((a, b) => Number(pinned.includes(b.id)) - Number(pinned.includes(a.id)));
  }, [items, locale, query, sort, pinned]);

  const updateView = (next: 'grid' | 'list') => {
    setView(next);
    try { window.localStorage.setItem(displayKey, next); } catch { /* optional */ }
  };

  useEffect(() => {
    try {
      const ids = JSON.parse(window.localStorage.getItem(key) ?? '[]') as unknown;
      if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) return;
      const order = new Map(ids.map((id, index) => [id, index]));
      setItems(
        [...playlists].sort(
          (a, b) =>
            (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
        ),
      );
    } catch {
      // Browser privacy settings can block optional ordering preferences.
      setItems(playlists);
    }
  }, [key, playlists]);

  function onMove(from: number, to: number) {
    if (from === to || sort !== 'custom' || query.trim() || pinned.length > 0) return;
    const next = moveItem(items, from, to);
    setItems(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next.map((item) => item.id)));
      setMessage(
        locale === 'ar'
          ? 'تم حفظ ترتيب قوائم التشغيل على الجهاز'
          : 'Playlist order saved on this device',
      );
    } catch {
      setMessage(
        locale === 'ar'
          ? 'اتغير الترتيب هنا، لكن المتصفح ما سمحش بحفظه'
          : 'Order changed, but this browser could not save it',
      );
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[160px] flex-1 text-xs text-muted">
          {locale === 'ar' ? 'ابحث في قوائم التشغيل' : 'Search playlists'}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={locale === 'ar' ? 'اسم القائمة أو صاحبها' : 'Name or owner'}
            className="mt-1 block min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          />
        </label>
        <label className="text-xs text-muted">
          {locale === 'ar' ? 'ترتيب حسب' : 'Sort by'}
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as 'custom' | 'recent' | 'title')}
            className="mt-1 block min-h-11 rounded-xl border border-white/15 bg-[#28212f] px-3 text-sm text-ink"
          >
            <option value="custom">{locale === 'ar' ? 'ترتيبي' : 'My order'}</option>
            <option value="recent">{locale === 'ar' ? 'الأحدث' : 'Newest'}</option>
            <option value="title">{locale === 'ar' ? 'الاسم' : 'Name'}</option>
          </select>
        </label>
        <div role="group" aria-label={locale === 'ar' ? 'طريقة العرض' : 'Display mode'} className="flex min-h-11 items-center rounded-xl border border-white/15 p-1">
          {(['grid', 'list'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => updateView(mode)}
              aria-pressed={view === mode}
              className={`min-h-9 rounded-lg px-3 text-xs font-semibold ${view === mode ? 'bg-primary text-black' : 'text-muted hover:bg-white/10'}`}
            >
              {mode === 'grid'
                ? locale === 'ar' ? 'شبكة' : 'Grid'
                : locale === 'ar' ? 'قائمة' : 'List'}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs leading-5 text-muted">
        {query.trim()
          ? locale === 'ar'
            ? `النتائج: ${shown.length} من ${items.length}`
            : `Showing ${shown.length} of ${items.length}`
          : sort === 'custom' && pinned.length === 0
            ? locale === 'ar'
              ? 'اسحب علامة الترتيب لتغيير مكان القائمة. الترتيب بيتحفظ على الجهاز ده.'
              : 'Drag the handle to rearrange playlists. Order is saved on this device.'
            : locale === 'ar'
              ? 'اختار «ترتيبي» وشيل التثبيت علشان ترتب القوائم بنفسك.'
              : 'Choose My order and unpin playlists to rearrange them.'}
      </p>
      <p className="min-h-4 text-xs text-muted" role="status" aria-live="polite">
        {message}
      </p>
      {shown.length === 0 ? (
        <p role="status" className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-muted">
          {locale === 'ar' ? 'مفيش قوائم مطابقة للبحث.' : 'No playlists match your search.'}
        </p>
      ) : <DragReorderList
        items={shown}
        getId={(playlist) => playlist.id}
        locale={locale}
        layout={view}
        disabled={sort !== 'custom' || Boolean(query.trim()) || pinned.length > 0}
        onMove={onMove}
        className={view === 'grid' ? 'grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5' : 'space-y-3'}
        renderItem={(playlist) => (
          <div className="relative min-w-0 flex-1">
            <PlaylistCard playlist={playlist} locale={locale} />
            <button
              type="button"
              onClick={() => togglePin(playlist.id)}
              aria-pressed={pinned.includes(playlist.id)}
              aria-label={pinned.includes(playlist.id)
                ? locale === 'ar' ? `إلغاء تثبيت ${playlist.title}` : `Unpin ${playlist.title}`
                : locale === 'ar' ? `تثبيت ${playlist.title}` : `Pin ${playlist.title}`}
              title={pinned.includes(playlist.id) ? (locale === 'ar' ? 'إلغاء التثبيت' : 'Unpin') : (locale === 'ar' ? 'تثبيت' : 'Pin')}
              className={`absolute end-2 top-2 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-[#19131f]/90 transition hover:bg-[#382747] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${pinned.includes(playlist.id) ? 'text-primary' : 'text-white'}`}
            >
              <Pin className="h-4 w-4" fill={pinned.includes(playlist.id) ? 'currentColor' : 'none'} />
            </button>
          </div>
        )}
      />}
    </div>
  );
}
