import { reportInput } from '@ai-music/contracts';
import { mutateDb } from '@/lib/data/db';
import { createReport } from '@/lib/data/mutations';
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
    rateLimit(`report:${user.id}`, 10, 60_000);
    const input = await parseBody(request, reportInput);
    const report = mutateDb((db) => createReport(db, user, input));
    return jsonOk({ report });
  } catch (error) {
    return jsonError(error);
  }
}
