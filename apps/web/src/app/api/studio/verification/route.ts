import { mutateDb } from '@/lib/data/db';
import { requestVerification } from '@/lib/data/mutations';
import { z } from 'zod';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireUser,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({ artistId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { artistId } = await parseBody(request, schema);
    const verification = mutateDb((db) => requestVerification(db, user, artistId));
    return jsonOk({ verification });
  } catch (error) {
    return jsonError(error);
  }
}
