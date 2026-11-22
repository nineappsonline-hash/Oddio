'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { SessionUser } from '@ai-music/contracts';

// Desktop navigation and listening rail are never needed in mobile bundles.
const DesktopSidebar = dynamic(
  () => import('@/components/layout/Sidebar').then((mod) => mod.Sidebar),
  { ssr: false },
);
const DesktopListeningRail = dynamic(
  () => import('@/components/layout/ListeningRail').then((mod) => mod.ListeningRail),
  { ssr: false },
);

export function DesktopChrome({
  user,
  podcastMode,
}: {
  user: SessionUser | null;
  podcastMode: boolean;
}) {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  if (!desktop)
    return podcastMode ? null : (
      <div className="oddio-listening-rail hidden" aria-hidden="true" />
    );
  return (
    <>
      <DesktopSidebar user={user} />
      {!podcastMode ? <DesktopListeningRail /> : null}
    </>
  );
}
