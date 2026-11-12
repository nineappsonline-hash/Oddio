import { z } from 'zod';
import { mutateDb } from '@/lib/data/db';
import { createAlbum } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireUser,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({
  artistId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).default(''),
  releaseAt: z.string().datetime({ offset: true }).optional(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await parseBody(request, schema);
    const album = mutateDb((db) => createAlbum(db, user, input));
    return jsonOk({ album });
  } catch (error) {
    return jsonError(error);
  }
}
