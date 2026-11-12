import { NextResponse } from 'next/server';
import { z } from 'zod';
import { demoMode } from '@/lib/env';
import { findUserByEmail, readDb } from '@/lib/data/db';
import { verifyPassword } from '@/lib/auth/password';
import { setDemoSession } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { Errors } from '@/lib/errors';
import {
  assertSameOrigin,
  clientIp,
  jsonError,
  jsonOk,
  parseBody,
  rateLimit,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(`login:${clientIp(request)}`, 15, 60_000);
    const input = await parseBody(request, schema);

    if (demoMode) {
      const db = readDb();
      const user = findUserByEmail(db, input.email);
      if (!user || !verifyPassword(input.password, user.passwordHash)) {
        throw Errors.invalid('Email or password is incorrect.');
      }
      const response = NextResponse.json({
        data: { userId: user.id, emailed: false },
        error: null,
        requestId: crypto.randomUUID(),
      });
      setDemoSession(response, user.id);
      return response;
    }

    const supabase = await getSupabaseServer();
    if (!supabase) throw Errors.server('Authentication is not configured');
    const { error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error) throw Errors.invalid('Email or password is incorrect.');
    return jsonOk({ userId: null, emailed: false });
  } catch (error) {
    return jsonError(error);
  }
}
