import { NextResponse } from 'next/server';
import { CONTENT_LANGUAGE_COOKIE } from '@/lib/content-language';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  // A non-security preference, but still prevent cross-site form submissions.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }
  const form = await request.formData().catch(() => null);
  const value = form?.get('language');
  if (value !== 'ar' && value !== 'all') {
    return NextResponse.json({ error: 'Invalid content language' }, { status: 400 });
  }
  const rawReturnTo = form?.get('returnTo');
  const candidate = typeof rawReturnTo === 'string' ? rawReturnTo : '/en';
  // No external origins or redirect-to-server APIs.
  const safePath =
    /^\/(?:en|ar)(?:\/(?:[^?#]*))?(?:\?[^#]*)?$/.test(candidate) &&
    !candidate.includes('\\') &&
    !candidate.includes('//')
      ? candidate
      : '/en';

  const response = NextResponse.redirect(new URL(safePath, request.url), 303);
  response.cookies.set(CONTENT_LANGUAGE_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
