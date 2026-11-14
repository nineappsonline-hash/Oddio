import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeSlug } from '@ai-music/db';
import { demoMode } from '@/lib/env';
import { findUserByEmail, mutateDb, readDb, toSessionUser } from '@/lib/data/db';
import { hashPassword } from '@/lib/auth/password';
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
  password: z.string().min(8).max(200),
  displayName: z.string().trim().min(1).max(80),
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_](?:[a-z0-9_.-]{1,28}[a-z0-9_])?$/),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(`signup:${clientIp(request)}`, 8, 60 * 60_000);
    const input = await parseBody(request, schema);

    if (demoMode) {
      if (readDb().users.some((user) => user.handle.toLowerCase() === input.handle)) throw Errors.conflict('Username already taken.');
      const existing = findUserByEmail(readDb(), input.email);
      if (existing) throw Errors.conflict('An account with this email already exists.');
      const result = mutateDb((db) => {
        if (findUserByEmail(db, input.email)) {
          throw Errors.conflict('An account with this email already exists.');
        }
        const baseHandle = input.handle;
        const taken = new Set(db.users.map((user) => user.handle));
        if (taken.has(baseHandle)) throw Errors.conflict('Username already taken.');
        const handle = baseHandle;
        const user = {
          id: crypto.randomUUID(),
          email: input.email.trim().toLowerCase(),
          passwordHash: hashPassword(input.password),
          handle,
          displayName: input.displayName.trim(),
          avatarUrl: '',
          locale: 'en' as const,
          country: '',
          roles: [],
          createdAt: new Date().toISOString(),
        };
        db.users.push(user);
        db.notificationPreferences.push({
          userId: user.id,
          releaseAlerts: true,
          emailOptIn: false,
          pushOptIn: false,
        });
        return user;
      });
      const response = NextResponse.json({
        data: toSessionUser(readDb(), result),
        error: null,
        requestId: crypto.randomUUID(),
      });
      setDemoSession(response, result.id);
      return response;
    }

    const supabase = await getSupabaseServer();
    if (!supabase) throw Errors.server('Authentication is not configured');
    const { data: existingUsername, error: usernameError } = await supabase.from('profiles').select('handle').eq('handle', input.handle).limit(1);
    if (usernameError) throw Errors.server('Could not verify username availability.');
    if (existingUsername?.length) throw Errors.conflict('Username already taken.');
    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          display_name: input.displayName,
          handle: input.handle,
        },
      },
    });
    if (error) throw Errors.invalid(error.message);
    return jsonOk({ userId: null, emailed: true });
  } catch (error) {
    return jsonError(error);
  }
}
