import { z } from 'zod';
import { assertSameOrigin, jsonError, jsonOk, parseBody, rateLimit, requireUser } from '@/lib/api-helpers';
import { demoMode } from '@/lib/env';
import { serviceClient } from '@/lib/data/supabase-store';

export const runtime = 'nodejs';

const entrySchema = z.object({
  episodeId: z.string().uuid(),
  seconds: z.number().finite().min(0).max(86400),
  duration: z.number().finite().positive().max(86400),
  updatedAt: z.number().finite().int().positive(),
  completed: z.boolean().optional().default(false),
});
const inputSchema = z.object({ entries: z.array(entrySchema).max(40) });

async function getEntries(userId: string) {
  if (demoMode) return [];
  const db = serviceClient();
  const { data, error } = await db.from('podcast_listening_progress')
    .select('episode_id,seconds,duration,updated_at,completed')
    .eq('user_id', userId).order('updated_at', { ascending: false }).limit(40);
  if (error) throw new Error('Unable to retrieve synced podcast progress');
  return (data ?? []).map((row) => ({
    episodeId: row.episode_id as string,
    seconds: Number(row.seconds),
    duration: Number(row.duration),
    updatedAt: new Date(row.updated_at as string).getTime(),
    completed: row.completed === true,
  }));
}

export async function GET() {
  try {
    const user = await requireUser();
    rateLimit(`podcast-progress:read:${user.id}`, 50, 60_000);
    return jsonOk({ entries: await getEntries(user.id) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`podcast-progress:write:${user.id}`, 24, 60_000);
    const { entries } = await parseBody(request, inputSchema);
    if (new Set(entries.map((entry) => entry.episodeId)).size !== entries.length) {
      return jsonOk({ entries: await getEntries(user.id), saved: false });
    }
    if (demoMode) return jsonOk({ entries: [], saved: false });

    const db = serviceClient();
    const { error } = await db.rpc('merge_podcast_listening_progress', {
      p_user_id: user.id,
      p_entries: entries,
    });
    if (error) throw new Error('Unable to save synced podcast progress');
    return jsonOk({ entries: await getEntries(user.id), saved: true });
  } catch (error) {
    return jsonError(error);
  }
}
