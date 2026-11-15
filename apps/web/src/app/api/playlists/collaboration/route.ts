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
  z.object({action:z.literal('remove'),playlistId:z.string().uuid(),userId:z.string().uuid()}),
  z.object({action:z.literal('revoke'),playlistId:z.string().uuid(),inviteId:z.string().uuid()}),
]);

async function requireOwner(playlistId:string,userId:string){
  const {data,error}=await serviceClient().from('playlists')
    .select('id,owner_id,visibility').eq('id',playlistId).maybeSingle();
  if(error) throw new Error(error.message);
  if(!data||data.owner_id!==userId) throw Errors.notFound('Playlist not found');
  return data;
}

export async function GET(request:Request){
  try{
    if(demoMode) throw Errors.invalid('Collaboration requires persistent accounts');
    const user=await requireUser();
    const url=new URL(request.url);
    const parsed=z.string().uuid().safeParse(url.searchParams.get('playlistId'));
    if(!parsed.success) throw Errors.invalid('Invalid playlist');
    const playlistId=parsed.data;
    await requireOwner(playlistId,user.id);
    const db=serviceClient();
    const [{data:members,error:memberError},{data:invites,error:inviteError}]=await Promise.all([
      db.from('playlist_collaborators').select('user_id,created_at')
        .eq('playlist_id',playlistId).order('created_at',{ascending:false}),
      db.from('playlist_collaboration_invites')
        .select('id,expires_at,max_uses,use_count,revoked_at')
        .eq('playlist_id',playlistId).order('created_at',{ascending:false}).limit(30),
    ]);
    if(memberError) throw new Error(memberError.message);
    if(inviteError) throw new Error(inviteError.message);
    const ids=(members??[]).map(m=>m.user_id);
    const {data:profiles,error:profileError}=ids.length
      ?await db.from('profiles').select('id,display_name').in('id',ids)
      :{data:[] as Array<{id:string;display_name:string}>,error:null};
    if(profileError) throw new Error(profileError.message);
    const names=new Map((profiles??[]).map(p=>[p.id,p.display_name]));
    return jsonOk({
      members:(members??[]).map(m=>({id:m.user_id,name:names.get(m.user_id)??'Oddio listener'})),
      invites:(invites??[]).map(i=>({
        id:i.id,expiresAt:i.expires_at,maxUses:i.max_uses,
        uses:i.use_count,revoked:Boolean(i.revoked_at),
      })),
    });
  }catch(error){return jsonError(error);}
}

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
    if(body.action==='revoke'||body.action==='remove'){
      await requireOwner(body.playlistId,user.id);
      if(body.action==='revoke'){
        const {error}=await db.from('playlist_collaboration_invites')
          .update({revoked_at:new Date().toISOString()})
          .eq('id',body.inviteId).eq('playlist_id',body.playlistId);
        if(error) throw new Error(error.message);
      }else{
        const {error}=await db.from('playlist_collaborators').delete()
          .eq('playlist_id',body.playlistId).eq('user_id',body.userId);
        if(error) throw new Error(error.message);
      }
      return jsonOk({updated:true});
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
