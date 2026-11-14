import type { SessionUser, StaffRole } from '@ai-music/contracts';
import { locales } from '@ai-music/contracts';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import type { Viewer } from '@ai-music/db';
import { demoMode, env } from '@/lib/env';
import { getSupabaseServer } from '@/lib/supabase/server';
import { verifySessionToken, signSessionToken } from './token';
import { findUserById, readDb, toSessionUser } from '@/lib/data/db';

export const SESSION_COOKIE = 'aim_session';
export const LOCALE_COOKIE = 'aim_locale';

export function setDemoSession(response: NextResponse, userId: string): void {
  response.cookies.set(SESSION_COOKIE, signSessionToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    // WebKit rejects Secure cookies on HTTP test origins. Keep them enabled
    // for every HTTPS deployment, including production and Vercel previews.
    secure:
      process.env.NODE_ENV === 'production' && env.siteUrl.startsWith('https://'),
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure:
      process.env.NODE_ENV === 'production' && env.siteUrl.startsWith('https://'),
    path: '/',
    maxAge: 0,
  });
}

function mapLocale(value: unknown): 'en' | 'ar' {
  return typeof value === 'string' && (locales as readonly string[]).includes(value)
    ? (value as 'en' | 'ar')
    : 'en';
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (demoMode) {
    const cookieStore = await cookies();
    const userId = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
    if (!userId) return null;
    const db = readDb();
    const user = findUserById(db, userId);
    if (!user) return null;
    return toSessionUser(db, user);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: roles }, { data: artists }, { data: approved }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('staff_roles').select('role').eq('user_id', user.id),
      supabase.from('artists').select('id').eq('owner_user_id', user.id),
      supabase
        .from('artist_applications')
        .select('id')
        .eq('applicant_id', user.id)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle(),
    ]);

  const profileRow = (profile ?? {}) as Record<string, unknown>;
  return {
    id: user.id,
    email: user.email ?? '',
    handle:
      typeof profileRow.handle === 'string'
        ? profileRow.handle
        : (user.email?.split('@')[0] ?? 'listener'),
    displayName:
      typeof profileRow.display_name === 'string'
        ? profileRow.display_name
        : ((user.user_metadata?.display_name as string | undefined) ?? 'Listener'),
    avatarUrl: typeof profileRow.avatar_key === 'string' ? profileRow.avatar_key : '',
    locale: mapLocale(profileRow.locale),
    country: typeof profileRow.country === 'string' ? profileRow.country : '',
    roles: ((roles ?? []) as Array<{ role: StaffRole }>).map((row) => row.role),
    isArtistManager: Boolean(approved),
    artistIds: ((artists ?? []) as Array<{ id: string }>).map((row) => row.id),
  };
}

export async function getViewer(): Promise<Viewer> {
  const user = await getSessionUser();
  return { userId: user?.id ?? null, roles: user?.roles ?? [] };
}

export function viewerFrom(user: SessionUser | null): Viewer {
  return { userId: user?.id ?? null, roles: user?.roles ?? [] };
}
