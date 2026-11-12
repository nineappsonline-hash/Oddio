import { applicationDecisionInput } from '@ai-music/contracts';
import { mutateDb } from '@/lib/data/db';
import { decideApplication } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireRole,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireRole(['admin', 'super_admin']);
    const { id } = await context.params;
    const input = await parseBody(request, applicationDecisionInput);
    const application = mutateDb((db) =>
      decideApplication(db, user, id, input.decision, input.notes),
    );
    return jsonOk({ application });
  } catch (error) {
    return jsonError(error);
  }
}
