import { z } from 'zod';
import { locales } from '@ai-music/contracts';
import { mutateDb } from '@/lib/data/db';
import { updateProfile } from '@/lib/data/mutations';
import { assertSameOrigin, jsonError, jsonOk, parseBody } from '@/lib/api-helpers';
import { requireUser } from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  locale: z.enum(locales).optional(),
  country: z.string().trim().max(2).optional(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await parseBody(request, schema);
    mutateDb((db) => updateProfile(db, user, input));
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
