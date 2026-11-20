'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CatalogTrack } from '@/lib/data/queries';
import { TrackCard } from '@/components/music/TrackCard';
import {
  homePersonalizationKey,
  parseHomePersonalizationPreference,
} from '@/lib/home-personalization';

export function FollowedReleasesHome({
  locale,
  viewerId,
  tracks,
}: {
  locale: 'ar' | 'en';
  viewerId: string;
  tracks: CatalogTrack[];
}) {
  const [enabled, setEnabled] = useState(false);
  const ar = locale === 'ar';
  useEffect(() => {
    const read = () => {
      try {
        setEnabled(
          parseHomePersonalizationPreference(
            window.localStorage.getItem(homePersonalizationKey(viewerId)),
          ),
        );
      } catch {
        setEnabled(true);
      }
    };
    read();
    window.addEventListener('storage', read);
    window.addEventListener('oddio-home-personalization-changed', read);
    return () => {
      window.removeEventListener('storage', read);
      window.removeEventListener('oddio-home-personalization-changed', read);
    };
  }, [viewerId]);

  if (!enabled || !tracks.length) return null;
  return (
    <section
      className="oddio-dashboard-section"
      aria-label={ar ? 'جديد الفنانين اللي بتتابعهم' : 'New from followed artists'}
    >
      <div className="oddio-section-title-row">
        <div>
          <p className="oddio-micro-label">
            {ar ? 'من الفنانين اللي بتتابعهم' : 'FROM ARTISTS YOU FOLLOW'}
          </p>
          <h2>{ar ? 'أحدث أغاني الفنانين المفضلين' : 'New from your artists'}</h2>
          <p className="text-sm text-muted">
            {ar
              ? 'آخر الأغاني المتاحة من الفنانين اللي اخترت تتابعهم.'
              : 'Fresh playable releases from artists you chose to follow.'}
          </p>
        </div>
        <Link href={`/${locale}/discover`} className="oddio-section-action">
          {ar ? 'اكتشف أكتر' : 'Discover more'}{' '}
          <ArrowRight size={16} className="rtl:-scale-x-100" />
        </Link>
      </div>
      <div className="oddio-explore-results-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tracks.map((track) => (
          <TrackCard key={track.id} track={track} queue={tracks} />
        ))}
      </div>
    </section>
  );
}
