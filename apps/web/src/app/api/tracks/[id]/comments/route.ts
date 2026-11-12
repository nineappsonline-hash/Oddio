import { commentInput } from '@ai-music/contracts';
import { readDb, mutateDb } from '@/lib/data/db';
import { createComment } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  rateLimit,
  requireUser,
} from '@/lib/api-helpers';
import { accessForTrack } from '@/lib/data/queries';
import { getViewer } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const db = readDb();
    const viewer = await getViewer();
    const track = db.tracks.find((item) => item.id === id);
    if (!track || !accessForTrack(db, track, viewer).allowed) {
      return jsonOk({ comments: [] });
    }
    const comments = db.comments
      .filter((comment) => comment.trackId === id && comment.status === 'visible')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return jsonOk({ comments });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`comment:${user.id}`, 10, 60_000);
    const { id } = await context.params;
    const input = await parseBody(request, commentInput);
    const comment = mutateDb((db) => createComment(db, user, id, input.body));
    return jsonOk({ comment });
  } catch (error) {
    return jsonError(error);
  }
}
