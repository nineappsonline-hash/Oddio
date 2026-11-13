import { assertSameOrigin, jsonError, jsonOk, requireRole } from '@/lib/api-helpers';
import { serviceClient } from '@/lib/data/supabase-store';
import { Errors } from '@/lib/errors';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 try {
  assertSameOrigin(request);
  const user=await requireRole(['admin','super_admin','moderator']);
  const {id}=await params;
  const {decision,note}=await request.json() as {decision:string,note?:string};
  if(!['approved','rejected'].includes(decision)) throw Errors.invalid('Invalid decision.');
  const db=serviceClient();
  const {data:change,error}=await db.from('track_change_requests').select('*').eq('id',id).eq('status','pending').single();
  if(error||!change) throw Errors.invalid('Request is no longer pending.');
  if(decision==='approved'){
    const values=change.change_type==='srt'?{synced_lyrics_srt:change.srt_content}:{artwork_key:db.storage.from('artwork').getPublicUrl(change.artwork_key).data.publicUrl};
    const updated=await db.from('tracks').update(values).eq('id',change.track_id);
    if(updated.error) throw updated.error;
  }
  const reviewed=await db.from('track_change_requests').update({status:decision,reviewer_id:user.id,reviewer_note:typeof note==='string'?note.slice(0,1000):null,reviewed_at:new Date().toISOString()}).eq('id',id).eq('status','pending');
  if(reviewed.error) throw reviewed.error;
  return jsonOk({status:decision});
 }catch(error){return jsonError(error)}
}
