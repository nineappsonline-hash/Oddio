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
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';

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

function ResendConfirmation({ initialEmail = '' }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  async function resend(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFeedback('');
    setError('');
    try {
      await apiRequest('/api/auth/resend-confirmation', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setFeedback(
        'If your email is not yet confirmed, we have requested a new confirmation link. Check your inbox and spam folder.',
      );
    } catch (caught) {
      setError(
        caught instanceof ApiClientError
          ? caught.message
          : 'Unable to resend confirmation email.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={resend}
      className="mt-5 space-y-3 rounded-xl border border-white/10 p-4"
    >
      <p className="text-sm font-semibold text-ink">
        Did not receive your confirmation email?
      </p>
      <label htmlFor="resend-email" className="block text-xs text-muted">
        Email address
      </label>
      <input
        id="resend-email"
        type="email"
        required
        autoComplete="email"
        className="input w-full"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Button type="submit" loading={pending} className="w-full">
        Resend confirmation email
      </Button>
      {feedback ? (
        <p role="status" className="text-sm text-ink">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
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
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupComplete, setSignupComplete] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSignupError(null);
    try {
      const result = await apiRequest<{ emailed?: boolean }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          displayName,
          handle: handle || undefined,
          email,
          password,
        }),
      });
      if (result.emailed) {
        setSignupComplete(true);
      } else {
        window.location.assign(next || `/${locale}`);
      }
    } catch (caught) {
      setSignupError(
        caught instanceof ApiClientError ? caught.message : 'Could not create account',
      );
    }
  }

  if (signupComplete) {
    return (
      <div role="status" className="card p-6 space-y-4">
        <h2 className="text-xl font-bold">Check your email</h2>
        <p>
          We created your account request. Open the confirmation email sent to {email} and
          confirm your address before logging in. Check your spam folder too.
        </p>
        <ResendConfirmation initialEmail={email} />
        <Link href={loginHref(locale, next)} className="btn btn-primary inline-block">
          Go to login
        </Link>
      </div>
    );
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
        {signupError ? (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
            {signupError}
          </p>
        ) : null}
        <Button type="submit" loading={false} className="w-full">
          {t('auth.createAccount')}
        </Button>
      </form>
      <SocialAuthButtons locale={locale} next={next} />
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
