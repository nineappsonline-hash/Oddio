import { z } from 'zod';
import { staffRoleValues } from '@ai-music/contracts';
import { mutateDb } from '@/lib/data/db';
import { setUserRole } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireRole,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({
  role: z.enum(staffRoleValues).nullable(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireRole(['super_admin']);
    const { id } = await context.params;
    const input = await parseBody(request, schema);
    mutateDb((db) => setUserRole(db, user, id, input.role));
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
