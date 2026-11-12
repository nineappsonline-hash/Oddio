import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { demoMode } from '@/lib/env';
import { assertSameOrigin } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!demoMode) {
      const supabase = await getSupabaseServer();
      await supabase?.auth.signOut();
    }
    const response = NextResponse.json({
      data: { ok: true },
      error: null,
      requestId: crypto.randomUUID(),
    });
    clearSessionCookie(response);
    return response;
  } catch {
    const response = NextResponse.json(
      {
        data: null,
        error: { code: 'server_error', message: 'Server error' },
        requestId: crypto.randomUUID(),
      },
      { status: 500 },
    );
    clearSessionCookie(response);
    return response;
  }
}
