'use client';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import type { Locale } from '@ai-music/contracts';

export function SocialAuthButtons({ locale, next }: { locale: Locale; next: string }) {
  const [busy, setBusy] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState('');
  async function connect(provider: 'google' | 'facebook') {
    if (busy) return;
    setBusy(provider);
    setError('');
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError(locale === 'ar' ? 'تسجيل الدخول الاجتماعي غير متاح حاليًا.' : 'Social sign-in is not configured yet.');
      setBusy(null);
      return;
    }
    const redirectTo = new URL('/auth/callback', window.location.origin);
    redirectTo.searchParams.set('next', next);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo.toString() },
    });
    if (oauthError) {
      setError(oauthError.message);
      setBusy(null);
    }
  }
  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-white/10" />
        <span>{locale === 'ar' ? 'أو المتابعة باستخدام' : 'Or continue with'}</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => void connect('google')} disabled={busy !== null}
          className="flex min-h-12 items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-bold text-ink transition hover:border-white/35 hover:bg-white/10 disabled:opacity-60">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.2c0-.7-.06-1.38-.18-2.03H12v3.85h5.24a4.48 4.48 0 0 1-1.95 2.94v2.44h3.15c1.85-1.7 2.91-4.2 2.91-7.2Z"/><path fill="#34A853" d="M12 21.7c2.63 0 4.84-.87 6.45-2.3l-3.15-2.44c-.87.59-1.99.94-3.3.94a5.84 5.84 0 0 1-5.5-4.05H3.25v2.5A9.74 9.74 0 0 0 12 21.7Z"/><path fill="#FBBC05" d="M6.5 13.85a5.85 5.85 0 0 1 0-3.7v-2.5H3.25a9.75 9.75 0 0 0 0 8.7l3.25-2.5Z"/><path fill="#EA4335" d="M12 6.1c1.43 0 2.7.49 3.71 1.45l2.79-2.79A9.3 9.3 0 0 0 12 2.3a9.74 9.74 0 0 0-8.75 5.35l3.25 2.5A5.84 5.84 0 0 1 12 6.1Z"/></svg>
          {busy === 'google' ? 'Connecting…' : locale === 'ar' ? 'المتابعة بجوجل' : 'Continue with Google'}
        </button>
        <button type="button" onClick={() => void connect('facebook')} disabled={busy !== null}
          className="flex min-h-12 items-center justify-center gap-3 rounded-xl border border-[#1877F2]/40 bg-[#1877F2]/15 px-4 py-3 text-sm font-bold text-ink transition hover:bg-[#1877F2]/25 disabled:opacity-60">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12Z"/><path fill="#fff" d="m16.66 15.47.53-3.47h-3.32V9.76c0-.95.46-1.87 1.95-1.87h1.51V4.94s-1.37-.24-2.68-.24c-2.74 0-4.53 1.66-4.53 4.66V12H7.08v3.47h3.04v8.38a12.1 12.1 0 0 0 3.75 0v-8.38h2.79Z"/></svg>
          {busy === 'facebook' ? 'Connecting…' : locale === 'ar' ? 'المتابعة بفيسبوك' : 'Continue with Facebook'}
        </button>
      </div>
      {error ? <p role="alert" className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
