import { applicationDecisionInput } from '@ai-music/contracts';
import { mutateDb } from '@/lib/data/db';
import { decideApplication } from '@/lib/data/mutations';
import { demoMode } from '@/lib/env';
import { getSupabaseServer } from '@/lib/supabase/server';
import { Errors } from '@/lib/errors';
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
    if (demoMode) {
      const application = mutateDb((db) =>
        decideApplication(db, user, id, input.decision, input.notes),
      );
      return jsonOk({ application });
    }

    const supabase = await getSupabaseServer();
    if (!supabase) throw Errors.unauthorized();
    const { data: existing, error: lookupError } = await supabase
      .from('artist_applications')
      .select('id, applicant_id, status')
      .eq('id', id)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (!existing) throw Errors.notFound('Application not found');
    if (existing.applicant_id === user.id) throw Errors.forbidden();
    if (!['submitted', 'under_review', 'needs_information'].includes(existing.status)) {
      throw Errors.conflict('This application has already been reviewed');
    }

    const status = {
      approve: 'approved',
      reject: 'rejected',
      request_information: 'needs_information',
    }[input.decision];
    const { data: application, error } = await supabase
      .from('artist_applications')
      .update({ status, review_notes: input.notes, reviewer_id: user.id })
      .eq('id', id)
      .eq('status', existing.status)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(`Application review failed: ${error.message}`);
    if (!application) {
      throw Errors.conflict('Application was modified by another reviewer');
    }

    return jsonOk({
      application: {
        id: application.id,
        applicantId: application.applicant_id,
        displayName: application.display_name,
        description: application.description,
        portfolioUrl: application.portfolio_url,
        contactEmail: application.contact_email,
        rightsDeclared: application.rights_declared,
        status: application.status,
        reviewNotes: application.review_notes,
        createdAt: application.created_at,
        updatedAt: application.updated_at,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
