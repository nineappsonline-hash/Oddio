import { reportInput } from '@ai-music/contracts';
import { mutateDb } from '@/lib/data/db';
import { loadDbFromSupabase, persistChanges } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
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
    let report;
    if (demoMode) {
      report = mutateDb((db) => createReport(db, user, input));
    } else {
      const before = await loadDbFromSupabase();
      const after = structuredClone(before);
      report = createReport(after, user, input);
      await persistChanges(before, after);
    }
    return jsonOk({ report });
  } catch (error) {
    return jsonError(error);
  }
}
