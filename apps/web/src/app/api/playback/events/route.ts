import { playbackEventInput } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { mutateRuntimeDb } from '@/lib/data/runtime-store';
import { recordPlaybackEvent } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  clientIp,
  jsonError,
  jsonOk,
  parseBody,
  rateLimit,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(`events:${clientIp(request)}`, 240, 60_000);
    const input = await parseBody(request, playbackEventInput);
    const user = await getSessionUser();
    const result = await mutateRuntimeDb((db) =>
      recordPlaybackEvent(db, user ? { id: user.id, roles: user.roles } : null, input),
    );
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
