import { getSessionUser } from '@/lib/auth/session';
import { mutateDb } from '@/lib/data/db';
import { authorizePlayback } from '@/lib/data/mutations';
import {
  anonymousHash,
  assertSameOrigin,
  clientIp,
  jsonError,
  jsonOk,
  rateLimit,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    rateLimit(`playback:${clientIp(request)}`, 120, 60_000);
    const { id } = await context.params;
    const user = await getSessionUser();
    const authorization = mutateDb((db) =>
      authorizePlayback(
        db,
        user ? { id: user.id, roles: user.roles } : null,
        id,
        anonymousHash(request),
      ),
    );
    return jsonOk(authorization);
  } catch (error) {
    return jsonError(error);
  }
}
