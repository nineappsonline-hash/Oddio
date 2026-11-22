'use client';

import { useEffect } from 'react';

/**
 * Register the static-only service worker after first paint and page load.
 * Registration must not compete with first-render JS, images or audio startup.
 * The worker itself never pre-caches API responses, pages or private audio.
 */
export function StaticServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let idleId: number | undefined;

    const register = () => {
      if (cancelled) return;
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // Browsing and playback continue without service worker support.
      });
    };

    const schedule = () => {
      if (cancelled) return;
      // requestIdleCallback is optional on Safari; keep a bounded fallback.
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(register, { timeout: 5000 });
      } else {
        timer = setTimeout(register, 2000);
      }
    };

    if (document.readyState === 'complete') {
      schedule();
    } else {
      window.addEventListener('load', schedule, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener('load', schedule);
      if (timer !== undefined) clearTimeout(timer);
      if (idleId !== undefined && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, []);
  return null;
}
