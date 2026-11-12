'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiClientError, apiRequest } from '@/lib/client-api';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { loginHref } from '@/lib/use-locale-path';
import type { Locale } from '@ai-music/contracts';
import { useT } from '@/i18n/use-translator';

const DEMO_ACCOUNTS = [
  { email: 'listener@demo.local', label: 'Listener' },
  { email: 'artist@demo.local', label: 'Artist' },
  { email: 'artist2@demo.local', label: 'Artist 2' },
  { email: 'admin@demo.local', label: 'Admin' },
  { email: 'mod@demo.local', label: 'Moderator' },
];

function useAuth(locale: Locale, next: string) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(path: string, body: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      await apiRequest(path, { method: 'POST', body: JSON.stringify(body) });
      router.push(next || `/${locale}`);
      router.refresh();
      toast('Done', 'success');
      return true;
    } catch (caught) {
      const message =
        caught instanceof ApiClientError ? caught.message : 'Something went wrong';
      setError(message);
      return false;
    } finally {
      setPending(false);
    }
  }

  return { run, pending, error };
}

export function LoginForm({
  locale,
  next,
  initialError,
}: {
  locale: Locale;
  next: string;
  initialError?: string;
}) {
  const t = useT();
  const { run, pending, error } = useAuth(locale, next);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(initialError ?? '');

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLocalError('');
    await run('/api/auth/login', { email, password });
  }

  function fill(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('demo1234');
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t('auth.email')} htmlFor="login-email">
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input"
            placeholder="you@example.com"
          />
        </Field>
        <Field label={t('auth.password')} htmlFor="login-password">
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input"
            placeholder="••••••••"
          />
        </Field>
        {localError || error ? (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
            {localError || error}
          </p>
        ) : null}
        <Button type="submit" loading={pending} className="w-full">
          {t('auth.signIn')}
        </Button>
      </form>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {t('auth.demoAccounts')}
        </p>
        <div className="flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => fill(account.email)}
              className="rounded-pill border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted transition hover:border-primary/40 hover:text-ink"
            >
              {account.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted/80">{t('auth.demoNotice')}</p>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4 text-center text-sm text-muted">
        {t('auth.noAccount')}{' '}
        <Link
          href={`/${locale}/signup?next=${encodeURIComponent(next)}`}
          className="font-semibold text-primary hover:underline"
        >
          {t('auth.createAccount')}
        </Link>
      </div>
    </>
  );
}

export function SignupForm({ locale, next }: { locale: Locale; next: string }) {
  const t = useT();
  const { run, pending, error } = useAuth(locale, next);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await run('/api/auth/signup', {
      displayName,
      handle: handle || undefined,
      email,
      password,
    });
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t('auth.displayName')} htmlFor="signup-name">
          <input
            id="signup-name"
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="input"
            autoComplete="name"
          />
        </Field>
        <Field
          label={t('auth.handle')}
          hint={t('auth.handleHint')}
          htmlFor="signup-handle"
        >
          <input
            id="signup-handle"
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            className="input"
            autoComplete="username"
          />
        </Field>
        <Field label={t('auth.email')} htmlFor="signup-email">
          <input
            id="signup-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input"
            autoComplete="email"
          />
        </Field>
        <Field
          label={t('auth.password')}
          hint={t('auth.passwordHint')}
          htmlFor="signup-password"
        >
          <input
            id="signup-password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input"
            autoComplete="new-password"
          />
        </Field>
        {error ? (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
        ) : null}
        <Button type="submit" loading={pending} className="w-full">
          {t('auth.createAccount')}
        </Button>
      </form>
      <div className="mt-5 border-t border-white/10 pt-4 text-center text-sm text-muted">
        {t('auth.haveAccount')}{' '}
        <Link
          href={loginHref(locale, next)}
          className="font-semibold text-primary hover:underline"
        >
          {t('auth.signIn')}
        </Link>
      </div>
    </>
  );
}
