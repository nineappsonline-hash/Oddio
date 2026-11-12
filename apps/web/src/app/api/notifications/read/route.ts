import { z } from 'zod';
import { mutateDb } from '@/lib/data/db';
import { markNotificationsRead } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireUser,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({ ids: z.array(z.string()).optional() });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await parseBody(request, schema).catch(() => ({ ids: undefined }));
    mutateDb((db) => markNotificationsRead(db, user.id, input.ids));
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
