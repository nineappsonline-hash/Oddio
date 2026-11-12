import { z } from 'zod';
import { mutateDb } from '@/lib/data/db';
import { decideVerification } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireRole,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({
  decision: z.enum(['approve', 'reject']),
  notes: z.string().trim().max(2000).default(''),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireRole(['admin', 'super_admin']);
    const { id } = await context.params;
    const input = await parseBody(request, schema);
    const verification = mutateDb((db) =>
      decideVerification(db, user, id, input.decision, input.notes),
    );
    return jsonOk({ verification });
  } catch (error) {
    return jsonError(error);
  }
}
