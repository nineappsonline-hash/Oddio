'use client';

import { useT } from '@/i18n/use-translator';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale, SessionUser } from '@ai-music/contracts';
import { apiRequest } from '@/lib/client-api';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { LogoutButton } from '@/components/layout/LogoutButton';

export function SettingsForm({ user, locale }: { user: SessionUser; locale: Locale }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [uiLocale, setUiLocale] = useState<Locale>(user.locale);
  const [country, setCountry] = useState(user.country);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await apiRequest('/api/settings/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName, locale: uiLocale, country }),
      });
      toast(t('settings.saved'), 'success');
      if (uiLocale !== locale) {
        document.cookie = `aim_locale=${uiLocale}; path=/; max-age=31536000; samesite=lax`;
      }
      router.refresh();
    } catch {
      toast('Could not save settings.', 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card max-w-xl space-y-4 p-5">
      <Field label={t('settings.displayName')} htmlFor="settings-name">
        <input
          id="settings-name"
          className="input"
          value={displayName}
          maxLength={80}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </Field>
      <Field label={t('auth.email')} htmlFor="settings-email">
        <input
          id="settings-email"
          className="input"
          value={user.email}
          disabled
          readOnly
        />
      </Field>
      <Field label={t('settings.locale')} htmlFor="settings-locale">
        <select
          id="settings-locale"
          className="input"
          value={uiLocale}
          onChange={(event) => setUiLocale(event.target.value as Locale)}
        >
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
      </Field>
      <Field
        label={t('settings.country')}
        hint="ISO 3166-1 alpha-2, optional"
        htmlFor="settings-country"
      >
        <input
          id="settings-country"
          className="input uppercase"
          maxLength={2}
          value={country}
          onChange={(event) => setCountry(event.target.value.toUpperCase())}
        />
      </Field>
      <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <Button type="submit" loading={pending}>
          {t('common.save')}
        </Button>
        <LogoutButton />
      </div>
    </form>
  );
}
