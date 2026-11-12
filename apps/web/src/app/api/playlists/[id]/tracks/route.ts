import { z } from 'zod';
import { mutateDb } from '@/lib/data/db';
import { addTrackToPlaylist } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireUser,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({ trackId: z.string().min(1) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const input = await parseBody(request, schema);
    const playlist = mutateDb((db) => addTrackToPlaylist(db, user, id, input.trackId));
    return jsonOk({ playlist });
  } catch (error) {
    return jsonError(error);
  }
}
