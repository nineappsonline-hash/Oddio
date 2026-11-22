'use client';

import { useEffect } from 'react';

type MetricName = 'lcp' | 'cls' | 'fcp' | 'long_task' | 'audio_startup' | 'audio_rebuffer';
type WebEntry = PerformanceEntry & { hadRecentInput?: boolean; value?: number };

function pageGroup(path: string): 'home' | 'discover' | 'search' | 'podcasts' | 'other' {
  const part = path.split('/').filter(Boolean)[1] ?? '';
  if (!part) return 'home';
  if (part === 'discover') return 'discover';
  if (part === 'search') return 'search';
  if (part === 'podcasts') return 'podcasts';
  return 'other';
}

function browserGroup(ua: string): 'safari' | 'firefox' | 'chromium' | 'other' {
  if (/Firefox|FxiOS/i.test(ua)) return 'firefox';
  if (/Chrome|CriOS|Chromium|Edg\//i.test(ua)) return 'chromium';
  if (/Safari/i.test(ua)) return 'safari';
  return 'other';
}

/**
 * 5% anonymous sample. No track IDs, user IDs, URLs, IPs, titles or raw
 * user agents are sent; the backend only stores coarse device/page labels.
 * This is observational field telemetry, not a synthetic performance budget.
 */
export function ClientPerformance() {
  useEffect(() => {
    if (Math.random() >= 0.05 || typeof PerformanceObserver === 'undefined') return;
    const records = new Map<MetricName, number[]>();
    const add = (name: MetricName, value: number) => {
      if (!Number.isFinite(value) || value < 0 || value > 120000) return;
      const values = records.get(name) ?? [];
      if (values.length < 60) values.push(value);
      records.set(name, values);
    };
    const observers: PerformanceObserver[] = [];
    const observe = (
      type: string,
      callback: (entry: WebEntry) => void,
    ) => {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) callback(entry as WebEntry);
        });
        observer.observe({ type, buffered: true });
        observers.push(observer);
      } catch {
        // Firefox and Safari don't implement every performance entry type.
      }
    };
    observe('largest-contentful-paint', (entry) => {
      records.set('lcp', [entry.startTime]);
    });
    observe('layout-shift', (entry) => {
      if (!entry.hadRecentInput) add('cls', entry.value ?? 0);
    });
    observe('paint', (entry) => {
      if (entry.name === 'first-contentful-paint') records.set('fcp', [entry.startTime]);
    });
    observe('longtask', () => add('long_task', 1));
    observe('measure', (entry) => {
      if (entry.name === 'oddio:audio-startup') add('audio_startup', entry.duration);
      if (entry.name === 'oddio:audio-rebuffer') add('audio_rebuffer', entry.duration);
    });

    const initialPath = window.location.pathname;
    const locale = initialPath.startsWith('/ar') ? 'ar' : 'en';
    const device = window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
    const browser = browserGroup(navigator.userAgent);

    const flush = () => {
      if (!records.size) return;
      const metrics = Array.from(records, ([name, values]) => ({
        name,
        // CLS accumulates layout shifts, while long_task is a count.
        // Other entries report the most recent or average duration.
        value: name === 'cls' || name === 'long_task'
          ? values.reduce((sum, item) => sum + item, 0)
          : values.reduce((sum, item) => sum + item, 0) / values.length,
      })).filter(({ value }) => Number.isFinite(value) && value <= 120000);
      records.clear();
      if (!metrics.length) return;
      const payload = JSON.stringify({
        metrics,
        pageGroup: pageGroup(initialPath),
        deviceGroup: device,
        browserGroup: browser,
        locale,
      });
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon?.('/api/performance', blob)) return;
      } catch {
        // Some privacy modes disable sendBeacon; fall back to keepalive.
      }
      void fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
        credentials: 'omit',
      }).catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    const interval = window.setInterval(flush, 60_000);
    return () => {
      flush();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      for (const observer of observers) observer.disconnect();
    };
  }, []);
  return null;
}
