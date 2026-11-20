'use client';

import { useEffect, useState } from 'react';
import type { Playlist } from '@ai-music/contracts';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { DragReorderList } from '@/components/ui/DragReorderList';
import { moveItem } from '@/lib/reorder-items';

/** Playlist shelves are user-personalized. This ordering is saved in this
 * browser, without modifying other listeners' public playlist rankings. */
export function ReorderablePlaylistGrid({
  playlists, locale, userId, section = 'owned',
}: {
  playlists: Playlist[];
  locale: 'ar' | 'en';
  userId: string;
  section?: 'owned' | 'followed';
}) {
  const [items, setItems] = useState(playlists);
  const [message, setMessage] = useState('');
  const key = `oddio-library-playlist-order:${userId}:${section}`;

  useEffect(() => {
    try {
      const ids = JSON.parse(window.localStorage.getItem(key) ?? '[]') as unknown;
      if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) return;
      const order = new Map(ids.map((id, index) => [id, index]));
      setItems([...playlists].sort((a, b) =>
        (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
      ));
    } catch {
      // Browser privacy settings can block optional ordering preferences.
      setItems(playlists);
    }
  }, [key, playlists]);

  function onMove(from: number, to: number) {
    if (from === to) return;
    const next = moveItem(items, from, to);
    setItems(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next.map((item) => item.id)));
      setMessage(locale === 'ar' ? 'تم حفظ ترتيب قوائم التشغيل على الجهاز' : 'Playlist order saved on this device');
    } catch {
      setMessage(locale === 'ar' ? 'اتغير الترتيب هنا، لكن المتصفح ما سمحش بحفظه' : 'Order changed, but this browser could not save it');
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs leading-5 text-muted">
        {locale === 'ar' ? 'اسحب علامة الترتيب بجوار القائمة لتغيير مكانها. الترتيب محفوظ على الجهاز ده.'
          : 'Drag the handle beside a playlist to rearrange your library. Order is saved on this device.'}
      </p>
      <p className="min-h-4 text-xs text-muted" role="status" aria-live="polite">{message}</p>
      <DragReorderList items={items} getId={(playlist) => playlist.id} locale={locale}
        layout="grid" onMove={onMove}
        className="grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5"
        renderItem={(playlist) => <PlaylistCard playlist={playlist} locale={locale} />}
      />
    </div>
  );
}
