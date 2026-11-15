import { mutateDb } from '@/lib/data/db';
import { demoMode } from '@/lib/env';
import { toggleSocialAtomic } from '@/lib/data/atomic-social';
import { toggleArtistFollow } from '@/lib/data/mutations';
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
    rateLimit(`follow:${user.id}`, 60, 60_000);
    const { id } = await context.params;
    const following = demoMode
      ? mutateDb((db) => toggleArtistFollow(db, user, id))
      : await toggleSocialAtomic('artist', user, id);
    return jsonOk({ following });
  } catch (error) {
    return jsonError(error);
  }
}
