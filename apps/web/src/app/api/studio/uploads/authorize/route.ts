import { z } from 'zod';
import crypto from 'node:crypto';
import { getSupabaseServer } from '@/lib/supabase/server';
import { env, demoMode } from '@/lib/env';
import { Errors } from '@/lib/errors';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  rateLimit,
  requireUser,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(120),
  bytes: z.number().int().positive(),
});

const ALLOWED = ['audio/mpeg', 'audio/mp3'];

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`authorize:${user.id}`, 20, 60 * 60_000);
    const input = await parseBody(request, schema);
    if (!/\.mp3$/i.test(input.filename) || !ALLOWED.includes(input.contentType)) {
      throw Errors.invalid('Unsupported audio content type');
    }
    if (input.bytes > env.audioMaxUploadBytes) {
      throw Errors.invalid('File exceeds the maximum upload size');
    }
    if (!demoMode) {
      const supabase = await getSupabaseServer();
      if (!supabase) throw Errors.unauthorized();
      const { data: approved, error: approvalError } = await supabase
        .from('artist_applications')
        .select('id')
        .eq('applicant_id', user.id)
        .eq('status', 'approved')
        .limit(1);
      if (approvalError) throw new Error(approvalError.message);
      if (!approved?.length) throw Errors.forbidden();
      const { presignR2Put } = await import('@/lib/storage/r2-presign');
      const objectKey = `incoming/${user.id}/${crypto.randomUUID()}`;
      const grant = presignR2Put(objectKey, input.contentType);
      return jsonOk({
        mode: 'direct',
        uploadUrl: grant.url,
        objectKey,
        bucket: grant.bucket,
        expiresInSeconds: 300,
        method: 'PUT',
        headers: { 'Content-Type': input.contentType },
        note: 'Upload grant only. Track creation and media validation require a separate finalize step.',
      });
    }
    return jsonOk({
      mode: 'local',
      uploadEndpoint: '/api/studio/tracks',
      note: 'Demo mode uploads are processed by this server. Production uses short-lived R2 grants.',
    });
  } catch (error) {
    return jsonError(error);
  }
}
