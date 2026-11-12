import { artistApplicationInput } from '@ai-music/contracts';
import { mutateDb } from '@/lib/data/db';
import { submitArtistApplication } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  rateLimit,
  requireUser,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`apply:${user.id}`, 5, 60 * 60_000);
    const input = await parseBody(request, artistApplicationInput);
    const application = mutateDb((db) => submitArtistApplication(db, user, input));
    return jsonOk({ application });
  } catch (error) {
    return jsonError(error);
  }
}
