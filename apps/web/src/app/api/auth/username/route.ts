import { NextResponse } from 'next/server';
import { demoMode } from '@/lib/env';
import { readDb } from '@/lib/data/db';
import { getSupabaseServer } from '@/lib/supabase/server';
import { clientIp, rateLimit, jsonError } from '@/lib/api-helpers';

export const runtime = 'nodejs';
const usernamePattern = /^[a-z0-9_](?:[a-z0-9_.-]{1,28}[a-z0-9_])?$/;

export async function GET(request: Request) {
  try {
    rateLimit(`username-check:${clientIp(request)}`, 90, 60_000);
    const username = new URL(request.url).searchParams.get('username')?.trim().toLowerCase() ?? '';
    if (!usernamePattern.test(username)) {
      return NextResponse.json({ available: false, valid: false });
    }
    if (demoMode) {
      return NextResponse.json({ available: !readDb().users.some((u) => u.handle.toLowerCase() === username), valid: true });
    }
    const supabase = await getSupabaseServer();
    if (!supabase) return NextResponse.json({ error: 'Availability check unavailable' }, { status: 503 });
    const { data, error } = await supabase.from('profiles').select('handle').eq('handle', username).limit(1);
    if (error) return NextResponse.json({ error: 'Availability check unavailable' }, { status: 503 });
    return NextResponse.json({ available: (data?.length ?? 0) === 0, valid: true });
  } catch (error) { return jsonError(error); }
}
