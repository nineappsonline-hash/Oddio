import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { demoMode } from '@/lib/env';
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

const schema = z.object({ email: z.string().trim().email().max(254) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(`resend-confirmation:${clientIp(request)}`, 5, 60 * 60_000);
    const { email } = await parseBody(request, schema);
    if (demoMode) throw Errors.invalid('Email confirmation is not used in demo mode');
    const supabase = await getSupabaseServer();
    if (!supabase) throw Errors.server('Authentication is not configured');
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error && !/already confirmed|already registered|not found/i.test(error.message)) {
      throw Errors.invalid(error.message);
    }
    return jsonOk({
      message: 'If this account needs confirmation, a new email has been requested.',
    });
  } catch (error) {
    return jsonError(error);
  }
}
