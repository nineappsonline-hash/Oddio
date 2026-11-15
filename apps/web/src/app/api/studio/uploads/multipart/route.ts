import crypto from 'node:crypto';
import { z } from 'zod';
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
import {
  abortMultipart,
  beginMultipart,
  finishMultipart,
  listMultipartParts,
  presignMultipartPart,
} from '@/lib/storage/r2-multipart';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const owned = z.object({
  objectKey: z.string().max(180),
  uploadId: z.string().min(1).max(512),
  bytes: z.number().int().positive(),
});
const actions = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('start'),
    filename: z.string().min(1).max(255),
    contentType: z.enum(['audio/mpeg', 'audio/mp3']),
    bytes: z.number().int().positive(),
  }),
  owned.extend({ action: z.literal('list') }),
  owned.extend({ action: z.literal('part'), partNumber: z.number().int().min(1).max(10000) }),
  owned.extend({ action: z.literal('complete') }),
  owned.extend({ action: z.literal('abort') }),
]);

const PART_SIZE = R2_UPLOAD_PART_BYTES;
const MAX_BYTES = Math.min(env.audioMaxUploadBytes, 25 * 1024 * 1024);
function verifyBytes(bytes: number) {
  if (bytes < 5 * 1024 * 1024 || bytes > MAX_BYTES) {
    throw Errors.invalid('Multipart MP3 upload size is outside the allowed range');
  }
}
function verifyOwned(objectKey: string, userId: string) {
  if (!new RegExp(`^incoming/${userId}/[a-f0-9-]{36}$`).test(objectKey)) {
    throw Errors.forbidden();
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (demoMode) throw Errors.invalid('Multipart R2 uploads require production storage');
    const user = await requireUser();
    if (!user.isArtistManager) throw Errors.forbidden();
    rateLimit(`multipart:${user.id}`, 180, 60 * 60_000);
    const input = await parseBody(request, actions);
    verifyBytes(input.bytes);
    if (input.action === 'start') {
      if (!/\.mp3$/i.test(input.filename)) throw Errors.invalid('Only MP3 is allowed');
      const supabase = await getSupabaseServer();
      if (!supabase) throw Errors.unauthorized();
      const { data: approvals, error } = await supabase
        .from('artist_applications')
        .select('id')
        .eq('applicant_id', user.id)
        .eq('status', 'approved')
        .limit(1);
      if (error) throw new Error(error.message);
      if (!approvals?.length) throw Errors.forbidden();
      const objectKey = `incoming/${user.id}/${crypto.randomUUID()}`;
      const uploadId = await beginMultipart(objectKey);
      return jsonOk({ objectKey, uploadId, partSize: PART_SIZE, bytes: input.bytes });
    }
    verifyOwned(input.objectKey, user.id);
    if (input.action === 'abort') {
      await abortMultipart(input.objectKey, input.uploadId);
      return jsonOk({ aborted: true });
    }
    const parts = await listMultipartParts(input.objectKey, input.uploadId);
    const totalParts = multipartPartCount(input.bytes);
    const valid = uploadedMultipartPartsAreValid(input.bytes, parts);
    if (!valid) throw Errors.invalid('Multipart upload parts do not match the file size');
    if (input.action === 'list') {
      return jsonOk({ parts, partSize: PART_SIZE });
    }
    if (input.action === 'part') {
      if (input.partNumber > totalParts) throw Errors.invalid('Part exceeds the upload size');
      return jsonOk({
        uploadUrl: presignMultipartPart(input.objectKey, input.uploadId, input.partNumber),
        partNumber: input.partNumber,
        bytes: multipartPartLength(input.bytes, input.partNumber),
      });
    }
    if (parts.length !== totalParts ||
        parts.some((part, index) => part.partNumber !== index + 1)) {
      throw Errors.invalid('Not all audio parts have arrived in R2');
    }
    await finishMultipart(input.objectKey, input.uploadId, parts);
    return jsonOk({ objectKey: input.objectKey, bytes: input.bytes, completed: true });
  } catch (error) {
    return jsonError(error);
  }
}
