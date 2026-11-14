import { z } from 'zod';
import { assertSameOrigin, jsonError, jsonOk, parseBody, requireRole } from '@/lib/api-helpers';
import { serviceClient } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';

export const runtime = 'nodejs';

const schema = z.object({ jobId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireRole(['admin', 'super_admin']);
    const { jobId } = await parseBody(request, schema);
    if (demoMode) return jsonOk({ retried: false, reason: 'unavailable_in_demo' }, undefined, 409);

    const db = serviceClient();
    const { data: job, error } = await db
      .from('jobs')
      .select('id,type,state,attempts,max_attempts,updated_at')
      .eq('id', jobId)
      .eq('type', 'media.transcode')
      .maybeSingle();
    if (error) throw error;
    if (!job || job.state !== 'failed' || job.attempts >= job.max_attempts) {
      return jsonOk({ retried: false, reason: 'not_retryable' }, undefined, 409);
    }
    const { data: updated, error: updateError } = await db
      .from('jobs')
      .update({ state: 'queued', next_run_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('type', 'media.transcode')
      .eq('state', 'failed')
      .eq('attempts', job.attempts)
      .eq('updated_at', job.updated_at)
      .select('id')
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) return jsonOk({ retried: false, reason: 'already_changed' }, undefined, 409);
    return jsonOk({ retried: true });
  } catch (error) {
    return jsonError(error);
  }
}
