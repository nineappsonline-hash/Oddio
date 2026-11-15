'use client';

import { useEffect } from 'react';

/** Never pre-cache pages, API responses or private Cloudflare audio. */
export function StaticServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Browsing and playback continue without service worker support.
    });
  }, []);
  return null;
}
