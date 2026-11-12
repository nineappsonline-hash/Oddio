import { NextResponse } from 'next/server';
import { demoMode, env } from '@/lib/env';
import { getSupabaseServer } from '@/lib/supabase/server';
import { safeRedirect } from '@/lib/utils';

export const runtime = 'nodejs';

const providers = ['google', 'apple', 'facebook'] as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider') ?? '';
  const next = safeRedirect(url.searchParams.get('next'), '/');
  const locale = url.searchParams.get('locale') === 'ar' ? 'ar' : 'en';

  if (!(providers as readonly string[]).includes(provider)) {
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=invalid_provider`, request.url),
    );
  }

  if (demoMode) {
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=oauth_unavailable`, request.url),
    );
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=oauth_unavailable`, request.url),
    );
  }

  const redirectTo = `${env.siteUrl.replace(/\/$/, '')}/auth/callback?next=${encodeURIComponent(next)}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as 'google' | 'apple' | 'facebook',
    options: { redirectTo },
  });
  if (error || !data.url) {
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=oauth_failed`, request.url),
    );
  }
  return NextResponse.redirect(data.url);
}
