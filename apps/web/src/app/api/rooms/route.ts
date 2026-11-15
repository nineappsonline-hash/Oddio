import crypto from 'node:crypto';
import { z } from 'zod';
import { demoMode } from '@/lib/env';
import { serviceClient } from '@/lib/data/supabase-store';
import { readRuntimeDb } from '@/lib/data/runtime-store';
import { getTrackPage } from '@/lib/data/queries';
import { Errors } from '@/lib/errors';
import {
  assertSameOrigin, jsonError, jsonOk, parseBody, rateLimit, requireUser,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const uuid = z.string().uuid();
const actions = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), title: z.string().trim().min(3).max(80) }),
  z.object({ action: z.literal('join'), roomId: uuid, code: z.string().regex(/^[a-f0-9]{64}$/) }),
  z.object({ action: z.literal('transport'), roomId: uuid, trackId: uuid.nullable(), playing: z.boolean(), seconds: z.number().finite().min(0).max(86400) }),
  z.object({ action: z.literal('message'), roomId: uuid, body: z.string().trim().min(1).max(300) }),
  z.object({ action: z.literal('moderate'), roomId: uuid, targetId: uuid, operation: z.enum(['mute','unmute','kick','hide']), messageId: z.number().int().positive().optional() }),
  z.object({ action: z.literal('close'), roomId: uuid }),
  z.object({ action: z.literal('leave'), roomId: uuid }),
]);

async function roomMember(roomId: string, userId: string) {
  const db = serviceClient();
  const { data: room, error } = await db.from('listening_rooms')
    .select('id,title,host_id,status,track_id,is_playing,position_seconds,synced_at,version,expires_at')
    .eq('id', roomId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!room || room.status !== 'open' || Date.parse(room.expires_at) <= Date.now()) {
    throw Errors.notFound('Listening room unavailable');
  }
  const { data: member, error: memberError } = await db.from('listening_room_members')
    .select('user_id,muted,banned,role').eq('room_id',roomId).eq('user_id',userId).maybeSingle();
  if (memberError) throw new Error(memberError.message);
  if (!member || member.banned) throw Errors.notFound('Listening room unavailable');
  return { room, member };
}

export async function GET(request: Request) {
  try {
    if (demoMode) throw Errors.invalid('Listening rooms require persistent accounts');
    const user = await requireUser();
    rateLimit(`room:read:${user.id}`, 90, 60_000);
    const url = new URL(request.url);
    const parsed = uuid.safeParse(url.searchParams.get('roomId'));
    if (!parsed.success) throw Errors.invalid('Invalid room ID');
    const roomId = parsed.data;
    const { room, member } = await roomMember(roomId, user.id);
    // Presence is refreshed at most once every 30 seconds to reduce DB writes.
    const {error:presenceError}=await serviceClient().from('listening_room_members')
      .update({last_seen_at:new Date().toISOString()})
      .eq('room_id',roomId).eq('user_id',user.id)
      .lt('last_seen_at',new Date(Date.now()-30_000).toISOString());
    if(presenceError) throw new Error(presenceError.message);
    const db = serviceClient();
    const [{data: people,error:peopleError},{data: messages,error:messageError}] = await Promise.all([
      db.from('listening_room_members').select('user_id,role,muted,last_seen_at')
        .eq('room_id',roomId).eq('banned',false).order('joined_at',{ascending:true}).limit(25),
      db.from('listening_room_messages').select('id,user_id,body,created_at')
        .eq('room_id',roomId).is('hidden_at',null)
        .order('id',{ascending:false}).limit(50),
    ]);
    if (peopleError) throw new Error(peopleError.message);
    if (messageError) throw new Error(messageError.message);
    const ids = [...new Set([...(people??[]).map(p=>p.user_id),...(messages??[]).map(m=>m.user_id)])];
    const {data: profiles,error:profileError}=ids.length
      ? await db.from('profiles').select('id,display_name').in('id',ids)
      : {data:[] as Array<{id:string;display_name:string}>,error:null};
    if (profileError) throw new Error(profileError.message);
    const names = new Map((profiles??[]).map(p=>[p.id,p.display_name]));
    return jsonOk({
      serverNow:new Date().toISOString(),
      room: {
        id:room.id,title:room.title,hostId:room.host_id,version:Number(room.version),
        trackId:room.track_id,playing:Boolean(room.is_playing),
        seconds:Number(room.position_seconds),syncedAt:room.synced_at,
        expiresAt:room.expires_at,
      },
      me:{id:user.id,muted:member.muted,host:room.host_id===user.id},
      members:(people??[]).map(p=>({
        id:p.user_id,name:names.get(p.user_id)??'Oddio listener',
        host:p.role==='host',muted:p.muted,active:Date.now()-Date.parse(p.last_seen_at)<60_000,
      })),
      messages:(messages??[]).reverse().map(m=>({
        id:m.id,userId:m.user_id,name:names.get(m.user_id)??'Oddio listener',
        body:m.body,createdAt:m.created_at,
      })),
    });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (demoMode) throw Errors.invalid('Listening rooms require persistent accounts');
    const user = await requireUser();
    rateLimit(`room:write:${user.id}`, 35, 60_000);
    const input = await parseBody(request,actions);
    const db = serviceClient();
    if (input.action === 'create') {
      const {data:existing,error:priorError}=await db.from('listening_rooms')
        .select('id').eq('host_id',user.id).eq('status','open')
        .gt('expires_at',new Date().toISOString()).limit(1);
      if (priorError) throw new Error(priorError.message);
      if (existing?.length) throw Errors.conflict('Close your existing room before creating a new one');
      const code=crypto.randomBytes(32).toString('hex');
      const codeHash=crypto.createHash('sha256').update(code).digest('hex');
      const {data:room,error}=await db.from('listening_rooms').insert({
        host_id:user.id,title:input.title,code_hash:codeHash,
      }).select('id').single();
      if (error) throw new Error(error.message);
      const {error:joinError}=await db.rpc('oddio_join_listening_room',{
        p_room_id:room.id,p_user_id:user.id,p_code_hash:codeHash,
      });
      if (joinError) {
        await db.from('listening_rooms').update({status:'closed'}).eq('id',room.id);
        throw new Error(joinError.message);
      }
      return jsonOk({roomId:room.id,code},undefined,201);
    }
    if (input.action === 'join') {
      const hash=crypto.createHash('sha256').update(input.code).digest('hex');
      const {error}=await db.rpc('oddio_join_listening_room',{
        p_room_id:input.roomId,p_user_id:user.id,p_code_hash:hash,
      });
      if (error?.code==='P0002') throw Errors.notFound('Invalid or expired room invitation');
      if (error?.code==='42501') throw Errors.forbidden();
      if (error?.code==='23514') throw Errors.conflict('Room has reached capacity');
      if (error) throw new Error(error.message);
      return jsonOk({roomId:input.roomId});
    }
    const {room,member}=await roomMember(input.roomId,user.id);
    if(input.action==='leave') {
      if(room.host_id===user.id) throw Errors.invalid('Host must close the room instead');
      const {error}=await db.from('listening_room_members').delete()
        .eq('room_id',room.id).eq('user_id',user.id).eq('role','listener');
      if(error) throw new Error(error.message);
      return jsonOk({left:true});
    }
    if(input.action==='message') {
      rateLimit(`room:chat:${user.id}`,8,60_000);
      const {data:id,error}=await db.rpc('oddio_room_message',{
        p_room_id:room.id,p_user_id:user.id,p_body:input.body,
      });
      if(error?.code==='42501') throw Errors.forbidden();
      if(error) throw new Error(error.message);
      return jsonOk({id});
    }
    if(input.action==='transport') {
      if(room.host_id!==user.id) throw Errors.forbidden();
      if(input.trackId) {
        const track=getTrackPage(await readRuntimeDb(),{userId:null,roles:[]},input.trackId)?.track;
        if(!track || !track.access.listable) throw Errors.invalid('Only published public tracks can play in rooms');
      }
      const {data:version,error}=await db.rpc('oddio_room_transport',{
        p_room_id:room.id,p_actor_id:user.id,p_track_id:input.trackId,
        p_playing:input.playing,p_position:input.seconds,
      });
      if(error) throw new Error(error.message);
      return jsonOk({version});
    }
    if(room.host_id!==user.id) throw Errors.forbidden();
    if(input.action==='close') {
      const {error}=await db.from('listening_rooms').update({
        status:'closed',is_playing:false,
      }).eq('id',room.id).eq('host_id',user.id).eq('status','open');
      if(error) throw new Error(error.message);
      return jsonOk({closed:true});
    }
    if(input.targetId===user.id) throw Errors.invalid('Host cannot moderate themselves');
    if(input.operation==='hide') {
      if(!input.messageId) throw Errors.invalid('Select a message');
      const {data:msg,error}=await db.from('listening_room_messages')
        .update({hidden_at:new Date().toISOString()}).eq('room_id',room.id)
        .eq('user_id',input.targetId).eq('id',input.messageId)
        .select('id').maybeSingle();
      if(error) throw new Error(error.message);
      if(!msg) throw Errors.notFound('Message not found');
    }else{
      const patch=input.operation==='kick'
        ?{banned:true}
        :{muted:input.operation==='mute'};
      const {data:target,error}=await db.from('listening_room_members').update(patch)
        .eq('room_id',room.id).eq('user_id',input.targetId)
        .eq('role','listener').select('user_id').maybeSingle();
      if(error) throw new Error(error.message);
      if(!target) throw Errors.notFound('Room member not found');
    }
    return jsonOk({updated:true});
  }catch(error){return jsonError(error);}
}
