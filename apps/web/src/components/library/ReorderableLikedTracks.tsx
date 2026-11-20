'use client';

import { useEffect, useState } from 'react';
import type { CatalogTrack } from '@/lib/data/queries';
import { TrackRow } from '@/components/music/TrackRow';
import { DragReorderList } from '@/components/ui/DragReorderList';
import { moveItem } from '@/lib/reorder-items';

export function ReorderableLikedTracks({
  initialTracks,
  locale,
  userId,
}: {
  initialTracks: CatalogTrack[];
  locale: 'ar' | 'en';
  userId: string;
}) {
  const [tracks, setTracks] = useState(initialTracks);
  const [message, setMessage] = useState('');
  const key = `oddio-library-liked-order:${userId}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(key) ?? '[]') as unknown;
      if (!Array.isArray(saved) || !saved.every((id) => typeof id === 'string')) {
        setTracks(initialTracks);
        return;
      }
      const positions = new Map(saved.map((id, index) => [id, index]));
      setTracks(
        [...initialTracks].sort(
          (a, b) =>
            (positions.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (positions.get(b.id) ?? Number.MAX_SAFE_INTEGER),
        ),
      );
    } catch {
      setTracks(initialTracks);
    }
  }, [initialTracks, key]);

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = moveItem(tracks, from, to);
    setTracks(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next.map((track) => track.id)));
      setMessage(
        locale === 'ar'
          ? 'تم حفظ ترتيب الأغاني على الجهاز'
          : 'Liked song order saved on this device',
      );
    } catch {
      setMessage(
        locale === 'ar'
          ? 'الترتيب اتغير لكن المتصفح رفض حفظه'
          : 'Order changed, but browser storage is unavailable',
      );
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs leading-5 text-muted">
        {locale === 'ar'
          ? 'اسحب العلامة بجانب الأغنية لترتيب المفضلة بنفسك. الترتيب بيتحفظ على الجهاز ده.'
          : 'Drag the handle next to a liked song to set a custom order. Saved on this device.'}
      </p>
      <p className="min-h-4 text-xs text-muted" aria-live="polite" role="status">
        {message}
      </p>
      <DragReorderList
        items={tracks}
        getId={(track) => track.id}
        locale={locale}
        onMove={reorder}
        className="card divide-y divide-white/5 p-2"
        renderItem={(track, index) => (
          <TrackRow track={track} queue={tracks} index={index} locale={locale} />
        )}
      />
    </div>
  );
}
