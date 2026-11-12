import { z } from 'zod';
import { mutateDb } from '@/lib/data/db';
import { setFeatured } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireRole,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({
  slot: z.enum(['hero', 'editorial', 'playlist']),
  entityType: z.enum(['track', 'artist', 'playlist']),
  entityId: z.string().min(1),
  action: z.enum(['add', 'remove']),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRole(['admin', 'super_admin']);
    const input = await parseBody(request, schema);
    mutateDb((db) => setFeatured(db, user, input));
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
