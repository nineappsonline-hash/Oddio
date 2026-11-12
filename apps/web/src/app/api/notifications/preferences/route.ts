import { z } from 'zod';
import { mutateDb } from '@/lib/data/db';
import { updateNotificationPreferences } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireUser,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({
  releaseAlerts: z.boolean().optional(),
  emailOptIn: z.boolean().optional(),
  pushOptIn: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await parseBody(request, schema);
    mutateDb((db) => updateNotificationPreferences(db, user.id, input));
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
