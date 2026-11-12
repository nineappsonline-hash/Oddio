import { z } from 'zod';
import { mutateDb } from '@/lib/data/db';
import { updateCommentStatus } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireRole,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({ status: z.enum(['visible', 'hidden']) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireRole(['moderator', 'admin', 'super_admin']);
    const { id } = await context.params;
    const input = await parseBody(request, schema);
    const comment = mutateDb((db) => updateCommentStatus(db, user, id, input.status));
    return jsonOk({ comment });
  } catch (error) {
    return jsonError(error);
  }
}
