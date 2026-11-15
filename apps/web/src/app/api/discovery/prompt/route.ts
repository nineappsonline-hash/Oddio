import { z } from 'zod';
import { getViewer } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { promptDiscoveryTracks } from '@/lib/data/prompt-discovery';
import { assertSameOrigin, jsonError, jsonOk, parseBody, rateLimit } from '@/lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const input = z.object({
  prompt: z.string().trim().min(3).max(240),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const viewer = await getViewer();
    rateLimit('discovery:prompt:' + (viewer.userId ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'guest'), 15, 60_000);
    const { prompt } = await parseBody(request, input);
    const db = demoMode ? readDb() : await loadDbFromSupabase();
    const result = promptDiscoveryTracks(db, viewer, prompt);
    const response = jsonOk(result);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
