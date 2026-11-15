import { getSessionUser } from '@/lib/auth/session';
import { mutateRuntimeDb } from '@/lib/data/runtime-store';
import { toggleLike } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  requireUser,
  rateLimit,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`like:${user.id}`, 60, 60_000);
    const { id } = await context.params;
    const liked = await mutateRuntimeDb((db) => toggleLike(db, user, id));
    return jsonOk({ liked });
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  const { id } = await context.params;
  return jsonOk({ trackId: id, userId: user?.id ?? null });
}
