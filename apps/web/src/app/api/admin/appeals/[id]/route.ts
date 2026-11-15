import { z } from 'zod';
import {
  assertSameOrigin, jsonError, jsonOk, parseBody, rateLimit, requireRole,
} from '@/lib/api-helpers';
import { serviceClient } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { Errors } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const review = z.object({
  status: z.enum(['under_review', 'upheld', 'overturned']),
  response: z.string().trim().min(15).max(2000).optional(),
}).refine((value) => value.status === 'under_review' || Boolean(value.response), {
  message: 'A written decision is required for resolved appeals',
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    if (demoMode) throw Errors.invalid('Appeals are not enabled in demo mode');
    const staff = await requireRole(['super_admin', 'admin', 'moderator']);
    rateLimit(`appeal-review:${staff.id}`, 40, 60 * 60_000);
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) throw Errors.invalid('Invalid appeal');
    const input = await parseBody(request, review);
    const db = serviceClient();
    const { data: open, error: fetchError } = await db
      .from('track_review_appeals')
      .select('id,status')
      .eq('id', id)
      .in('status', ['submitted', 'under_review'])
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!open) throw Errors.conflict('Appeal is no longer open');
    const fields = input.status === 'under_review'
      ? { status: input.status }
      : {
          status: input.status,
          response: input.response,
          reviewed_by: staff.id,
          reviewed_at: new Date().toISOString(),
        };
    const { data: updated, error } = await db.from('track_review_appeals')
      .update(fields)
      .eq('id', id)
      .in('status', ['submitted', 'under_review'])
      .select('id,status,reviewed_at')
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw Errors.conflict('Appeal was handled by another moderator');
    // A successful appeal does NOT auto-publish/reapprove potentially unsafe content.
    return jsonOk({ appeal: updated });
  } catch (error) {
    return jsonError(error);
  }
}
