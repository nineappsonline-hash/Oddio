import { artistApplicationInput } from '@ai-music/contracts';
import { mutateDb } from '@/lib/data/db';
import { submitArtistApplication } from '@/lib/data/mutations';
import { demoMode } from '@/lib/env';
import { getSupabaseServer } from '@/lib/supabase/server';
import { Errors, AppError } from '@/lib/errors';
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
    rateLimit(`apply:${user.id}`, 5, 60 * 60_000);
    const input = await parseBody(request, artistApplicationInput);
    if (demoMode) {
      const application = mutateDb((db) => submitArtistApplication(db, user, input));
      return jsonOk({ application });
    }

    if (!input.rightsDeclared) {
      throw Errors.invalid('You must confirm distribution rights');
    }
    const supabase = await getSupabaseServer();
    if (!supabase) throw new AppError('not_configured', 'Supabase is not configured', 503);

    // Use the authenticated user's client so RLS enforces applicant ownership.
    const { data: existing, error: lookupError } = await supabase
      .from('artist_applications')
      .select('id, status')
      .eq('applicant_id', user.id)
      .in('status', ['submitted', 'under_review', 'approved'])
      .limit(1);
    if (lookupError) throw new Error(`Application lookup failed: ${lookupError.message}`);
    if (existing?.length) throw Errors.conflict('You already have an application in progress');

    const { data: application, error } = await supabase
      .from('artist_applications')
      .insert({
        applicant_id: user.id,
        display_name: input.displayName,
        description: input.description,
        portfolio_url: input.portfolioUrl,
        contact_email: input.contactEmail,
        rights_declared: true,
        status: 'submitted',
      })
      .select('*')
      .single();
    if (error) throw new Error(`Application submission failed: ${error.message}`);
    return jsonOk({
      application: {
        id: application.id,
        applicantId: application.applicant_id,
        applicantName: user.displayName,
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
