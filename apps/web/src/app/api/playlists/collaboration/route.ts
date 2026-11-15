import crypto from 'node:crypto';
import { z } from 'zod';
import {
  assertSameOrigin,jsonError,jsonOk,parseBody,rateLimit,requireUser,
} from '@/lib/api-helpers';
import { demoMode } from '@/lib/env';
import { serviceClient } from '@/lib/data/supabase-store';
import { Errors } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const actions = z.discriminatedUnion('action',[
  z.object({action:z.literal('invite'),playlistId:z.string().uuid()}),
  z.object({action:z.literal('join'),code:z.string().regex(/^[a-f0-9]{64}$/)}),
]);

export async function POST(request:Request){
  try{
    assertSameOrigin(request);
    if(demoMode) throw Errors.invalid('Collaboration requires persistent accounts');
    const user=await requireUser();
    rateLimit(`playlist-invite:${user.id}`,10,60*60_000);
    const body=await parseBody(request,actions);
    const db=serviceClient();
    if(body.action==='invite'){
      const {data:playlist,error:lookupError}=await db.from('playlists')
        .select('id,owner_id,visibility').eq('id',body.playlistId).maybeSingle();
      if(lookupError) throw new Error(lookupError.message);
      if(!playlist||playlist.owner_id!==user.id) throw Errors.notFound('Playlist not found');
      if(playlist.visibility!=='public') throw Errors.invalid('Only public playlists can be shared for editing');
      const code=crypto.randomBytes(32).toString('hex');
      const hash=crypto.createHash('sha256').update(code).digest('hex');
      const expiresAt=new Date(Date.now()+7*86400000).toISOString();
      const {error}=await db.from('playlist_collaboration_invites').insert({
        playlist_id:playlist.id,creator_id:user.id,code_hash:hash,
        expires_at:expiresAt,max_uses:10,
      });
      if(error) throw new Error(error.message);
      return jsonOk({code,expiresAt,maxUses:10});
    }
    const hash=crypto.createHash('sha256').update(body.code).digest('hex');
    const {data:playlistId,error}=await db.rpc('oddio_join_playlist_invite',{
      p_user_id:user.id,p_code_hash:hash,
    });
    if(error){
      if(error.code==='P0002') throw Errors.notFound('Invite expired or invalid');
      if(error.code==='23505'||error.code==='23514') throw Errors.conflict('Unable to join this playlist');
      throw new Error(error.message);
    }
    return jsonOk({playlistId});
  }catch(error){return jsonError(error);}
}
