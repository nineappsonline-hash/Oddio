import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { safeRedirect } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeRedirect(url.searchParams.get('next'), '/');
  const locale = next.startsWith('/ar') ? 'ar' : 'en';

  if (!code) {
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=callback_error`, request.url),
    );
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=callback_error`, request.url),
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=callback_error`, request.url),
    );
  }
  return NextResponse.redirect(new URL(next, request.url));
}
