import { z } from 'zod';
import { demoMode } from '@/lib/env';
import { Errors } from '@/lib/errors';
import { serviceClient } from '@/lib/data/supabase-store';
import {
  assertSameOrigin, jsonError, jsonOk, parseBody, rateLimit, requireUser,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  allowed: z.boolean(),
  rightsConfirmed: z.boolean(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    if(demoMode) throw Errors.invalid('Offline rights require verified artist accounts');
    const user = await requireUser();
    if(!user.isArtistManager) throw Errors.forbidden();
    rateLimit(`offline-permission:${user.id}`, 20, 60*60_000);
    const {id}=await context.params;
    if(!z.string().uuid().safeParse(id).success) throw Errors.invalid('Invalid track');
    const input=await parseBody(request,schema);
    if(input.allowed && !input.rightsConfirmed) {
      throw Errors.invalid('Please confirm you control offline distribution rights');
    }
    const db=serviceClient();
    const {data:track,error:trackError}=await db.from('tracks')
      .select('id,artist_id').eq('id',id).maybeSingle();
    if(trackError) throw new Error(trackError.message);
    if(!track) throw Errors.notFound();
    const {data:artist,error:artistError}=await db.from('artists')
      .select('owner_user_id').eq('id',track.artist_id).maybeSingle();
    if(artistError) throw new Error(artistError.message);
    if(!artist || artist.owner_user_id!==user.id) throw Errors.notFound();
    const time=new Date().toISOString();
    const {error}=await db.from('track_offline_permissions').upsert({
      track_id:id,artist_user_id:user.id,
      allowed:input.allowed,
      rights_attested_at:input.allowed?time:null,
      revoked_at:input.allowed?null:time,
      terms_version:'offline-v1',updated_at:time,
    },{onConflict:'track_id'});
    if(error) throw new Error(error.message);
    // This only records the artist's rights attestation; it does NOT enable
    // browser downloads or grant a user any offline license.
    return jsonOk({trackId:id,allowed:input.allowed});
  }catch(error){return jsonError(error);}
}
