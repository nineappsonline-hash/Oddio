import { z } from 'zod';
import { env, demoMode } from '@/lib/env';
import { AppError, Errors } from '@/lib/errors';
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

const ALLOWED = [
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/mpeg',
  'audio/mp3',
  'audio/aiff',
];

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`authorize:${user.id}`, 20, 60 * 60_000);
    const input = await parseBody(request, schema);
    if (!ALLOWED.includes(input.contentType)) {
      throw Errors.invalid('Unsupported audio content type');
    }
    if (input.bytes > env.audioMaxUploadBytes) {
      throw Errors.invalid('File exceeds the maximum upload size');
    }
    if (!demoMode) {
      throw new AppError(
        'not_configured',
        'R2 direct upload requires Cloudflare credentials and is not enabled.',
        501,
      );
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
