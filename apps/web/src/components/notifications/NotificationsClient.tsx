'use client';

import { useT } from '@/i18n/use-translator';
import { useState } from 'react';
import type { Notification } from '@ai-music/contracts';
import { apiRequest } from '@/lib/client-api';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';
import type { Locale } from '@ai-music/contracts';

type Preferences = {
  userId: string;
  releaseAlerts: boolean;
  emailOptIn: boolean;
  pushOptIn: boolean;
};

export function NotificationsClient({
  initialNotifications,
  initialPreferences,
  locale,
}: {
  initialNotifications: Notification[];
  initialPreferences: Preferences;
  locale: Locale;
}) {
  const t = useT();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [pending, setPending] = useState(false);

  const unread = notifications.filter((item) => !item.readAt).length;

  async function markAll() {
    setPending(true);
    try {
      await apiRequest('/api/notifications/read', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
      toast(t('notifications.markAllRead'), 'success');
    } catch {
      toast('Could not update notifications.', 'error');
    } finally {
      setPending(false);
    }
  }

  async function togglePreference(key: keyof Omit<Preferences, 'userId'>) {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    try {
      await apiRequest('/api/notifications/preferences', {
        method: 'POST',
        body: JSON.stringify({ [key]: next[key] }),
      });
      toast(t('notifications.saved'), 'success');
    } catch {
      setPreferences(preferences);
      toast('Could not save preferences.', 'error');
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_0.5fr]">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {unread} {t('notifications.unread')}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={markAll}
            loading={pending}
            disabled={unread === 0}
          >
            {t('notifications.markAllRead')}
          </Button>
        </div>
        {notifications.length === 0 ? (
          <EmptyState title={t('notifications.empty')} />
        ) : (
          <ul className="space-y-2">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`card p-4 ${notification.readAt ? 'opacity-70' : ''}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">
                    {notification.title}
                  </span>
                  {!notification.readAt ? (
                    <Badge tone="primary">{t('common.new')}</Badge>
                  ) : null}
                  <span className="ms-auto text-[11px] text-muted">
                    {formatDate(notification.createdAt, locale)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{notification.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="card h-fit p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
          {t('notifications.preferences')}
        </h2>
        <div className="space-y-3">
          {(
            [
              ['releaseAlerts', t('notifications.releaseAlerts')],
              ['emailOptIn', t('notifications.emailOptIn')],
              ['pushOptIn', t('notifications.pushOptIn')],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-3 text-sm text-ink/90"
            >
              <input
                type="checkbox"
                checked={preferences[key]}
                onChange={() => togglePreference(key)}
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-surface accent-primary"
              />
              {label}
            </label>
          ))}
        </div>
      </aside>
    </div>
  );
}
