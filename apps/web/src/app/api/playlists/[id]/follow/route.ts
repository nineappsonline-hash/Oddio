import { mutateDb } from '@/lib/data/db';
import { togglePlaylistFollow } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  rateLimit,
  requireUser,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`playlist:follow:${user.id}`, 60, 60_000);
    const { id } = await context.params;
    const following = mutateDb((db) => togglePlaylistFollow(db, user, id));
    return jsonOk({ following });
  } catch (error) {
    return jsonError(error);
  }
}
