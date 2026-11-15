'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CatalogTrack } from '@/lib/data/queries';
import { apiRequest } from '@/lib/client-api';
import { usePlayer } from '@/lib/player-store';
import { roomShouldSeek, roomSyncedPosition } from '@/lib/room-playback-sync';

interface RoomView {
  serverNow: string;
  receivedAt: number;
  room: {
    id:string;title:string;hostId:string;version:number;trackId:string|null;
    playing:boolean;seconds:number;syncedAt:string;expiresAt:string;
  };
  track: CatalogTrack | null;
  me: {id:string;muted:boolean;host:boolean};
  members: Array<{id:string;name:string;host:boolean;muted:boolean;active:boolean}>;
  messages: Array<{id:number;userId:string;name:string;body:string;createdAt:string}>;
}
export function RoomSession({roomId,locale}:{roomId:string;locale:'ar'|'en'}){
  const ar=locale==='ar';
  const router=useRouter();
  const [snapshot,setSnapshot]=useState<RoomView|null>(null);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [invite,setInvite]=useState('');
  const [following,setFollowing]=useState(false);
  const [bootstrapped,setBootstrapped]=useState(false);
  const lastSynced=useRef<string>('');
  const cachedTrack=useRef<CatalogTrack|null>(null);
  const roomCodeKey=`oddio-room-code:${roomId}`;

  useEffect(()=>{
    setInvite(sessionStorage.getItem(roomCodeKey)??'');
    let active=true;
    async function poll(){
      try{
        const data=await apiRequest<Omit<RoomView,'receivedAt'|'track'>>(
          `/api/rooms?roomId=${encodeURIComponent(roomId)}`,{cache:'no-store'});
        if(!active)return;
        let track:CatalogTrack|null=null;
        if(data.room.trackId){
          if(cachedTrack.current?.id===data.room.trackId) track=cachedTrack.current;
          else {
            // Resolve metadata only on track changes. The playback API will
            // independently authorize each listener's R2 stream.
            try{
              track=await apiRequest<CatalogTrack>(
                `/api/tracks/${encodeURIComponent(data.room.trackId)}`);
              cachedTrack.current=track;
            }catch{cachedTrack.current=null;}
          }
        }else cachedTrack.current=null;
        if(!active)return;
        setSnapshot({...data,track,receivedAt:Date.now()});setError('');
      }catch(err){
        if(!active)return;
        setError(err instanceof Error?err.message:'Room unavailable');
      }finally{
        if(active)setBootstrapped(true);
      }
    }
    let polling=false;
    async function safePoll(){
      if(polling)return;
      polling=true;
      try{await poll();}finally{polling=false;}
    }
    void safePoll();
    const id=window.setInterval(()=>void safePoll(),4000);
    return ()=>{active=false;window.clearInterval(id);};
  },[roomId]);

  async function action(payload:Record<string,unknown>){
    setBusy(true);setError('');
    try{
      await apiRequest('/api/rooms',{method:'POST',
        body:JSON.stringify({...payload,roomId})});
      return true;
    }catch(e){setError(e instanceof Error?e.message:'Room action failed');return false;}
    finally{setBusy(false);}
  }
  function sync(){
    if(!snapshot?.track || snapshot.me.host)return;
    const target=roomSyncedPosition({
      seconds:snapshot.room.seconds,playing:snapshot.room.playing,
      syncedAt:snapshot.room.syncedAt,serverNow:snapshot.serverNow,
      elapsedClientMs:Date.now()-snapshot.receivedAt,
      durationSeconds:snapshot.track.durationMs/1000,
    });
    const player=usePlayer.getState();
    if(player.track?.id!==snapshot.track.id){
      player.play(snapshot.track,[snapshot.track]);
      player.seek(target);
    } else if(roomShouldSeek(player.currentTime,target)) {
      player.seek(target);
    }
    player.setPlaying(snapshot.room.playing);
  }
  useEffect(()=>{
    if(!snapshot || !following || snapshot.me.host)return;
    const signature=`${snapshot.room.trackId}:${snapshot.room.version}`;
    if(snapshot.track) {
      const current=usePlayer.getState();
      const pos=roomSyncedPosition({
        seconds:snapshot.room.seconds,playing:snapshot.room.playing,
        syncedAt:snapshot.room.syncedAt,serverNow:snapshot.serverNow,
        elapsedClientMs:Date.now()-snapshot.receivedAt,
        durationSeconds:snapshot.track.durationMs/1000,
      });
      const changed = lastSynced.current !== signature;
      const wrongTrack = current.track?.id !== snapshot.track.id;
      if(!changed && !wrongTrack && !roomShouldSeek(current.currentTime,pos) &&
        current.isPlaying===snapshot.room.playing) return;
      lastSynced.current=signature;
      if(wrongTrack) current.play(snapshot.track,[snapshot.track]);
      if(changed || wrongTrack || roomShouldSeek(current.currentTime,pos)) current.seek(pos);
      if(current.isPlaying!==snapshot.room.playing) current.setPlaying(snapshot.room.playing);
    } else {
      lastSynced.current=signature;
      usePlayer.getState().setPlaying(false);
    }
  },[snapshot,following]);

  async function setTransport(playing:boolean,reset=false){
    const player=usePlayer.getState();
    if(!player.track){setError(ar?'اختار أغنية في المشغل الأول.':'Select a song in the player first.');return;}
    await action({
      action:'transport',trackId:player.track.id,playing,
      seconds:reset?0:player.currentTime,
    });
  }

  if(!snapshot)return (
    <div className="rounded-2xl border border-white/10 p-6">
      <p className="text-sm text-muted">{error || (bootstrapped ? 'Room unavailable' : (ar?'جارٍ التحميل…':'Loading room…'))}</p>
    </div>
  );
  const host=snapshot.me.host;
  const room=snapshot.room;
  return <div className="space-y-6">
    <header className="space-y-3 rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/15 to-cyan-500/5 p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">ODDIO LISTENING ROOM</p>
      <h1 className="text-3xl font-black">{room.title}</h1>
      <p className="text-xs text-muted">
        {ar?'خاص بالدعوة · ينتهي':'Invite-only · ends'}
        {' '}{new Date(room.expiresAt).toLocaleString(locale)}
      </p>
      {host && invite ? <div className="space-y-2 rounded-xl border border-white/10 p-3">
        <p className="text-xs text-muted">{ar?'شارك معرّف الغرفة والرمز بشكل خاص':'Share the room ID and code privately'}</p>
        <p className="break-all font-mono text-xs">{room.id}</p>
        <p className="break-all font-mono text-xs">{invite}</p>
        <button type="button" className="min-h-10 rounded-lg border border-white/20 px-3 text-xs"
          onClick={()=>void navigator.clipboard.writeText(`${room.id}\n${invite}`)}>
          {ar?'نسخ بيانات الدعوة':'Copy invitation details'}
        </button>
      </div>:null}
      {host?<div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={()=>void setTransport(true)}
          className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-white">
          {ar?'شغّل الأغنية الحالية للجميع':'Play current track for room'}
        </button>
        <button type="button" disabled={busy} onClick={()=>void setTransport(false)}
          className="min-h-11 rounded-xl border border-white/20 px-4 text-sm">
          {ar?'إيقاف مؤقت للجميع':'Pause for everyone'}
        </button>
        <button type="button" disabled={busy} onClick={()=>void action({action:'close'}).then(ok=>{if(ok)router.push(`/${locale}/rooms`);})}
          className="min-h-11 rounded-xl border border-rose-400/30 px-4 text-sm text-rose-300">
          {ar?'إغلاق الغرفة':'Close room'}
        </button>
      </div>:<div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={()=>{setFollowing(true);sync();}}
          className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-white">
          {ar?'تابع تشغيل المضيف':'Follow host playback'}
        </button>
        <span className="text-xs text-muted">{following?(ar?'المزامنة شغالة':'Sync enabled'):(ar?'اضغط للانضمام للصوت':'Tap to start audio')}</span>
        <button type="button" disabled={busy}
          onClick={()=>void action({action:'leave'}).then(ok=>{if(ok)router.push(`/${locale}/rooms`);})}
          className="min-h-11 rounded-xl border border-white/20 px-4 text-sm">
          {ar?'مغادرة الغرفة':'Leave room'}
        </button>
      </div>}
      <div className="rounded-xl bg-black/20 p-4">
        <p className="text-sm font-semibold">
          {snapshot.track? `${snapshot.track.title} — ${snapshot.track.artist?.name??'Oddio'}`
            : (ar?'المضيف لسه ما اختارش أغنية':'Host has not selected a track')}
        </p>
        <p className="mt-1 text-xs text-muted">
          {room.playing?(ar?'شغّال':'Playing'):(ar?'متوقف':'Paused')}
          {' · '}{Math.floor(room.seconds)}s
        </p>
      </div>
      <p className="text-xs text-muted">
        {ar
          ? 'كل جهاز بيستخدم صلاحية التشغيل الخاصة بصاحبه. لا تتم مشاركة روابط الصوت الموقّعة.'
          : 'Every device requests its own authorized audio stream. Signed URLs are never shared.'}
      </p>
    </header>
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <h2 className="text-xl font-bold">{ar?'شات الغرفة':'Room chat'}</h2>
        <div className="mt-4 max-h-[400px] min-h-40 space-y-3 overflow-y-auto" aria-live="polite">
          {snapshot.messages.length?snapshot.messages.map(m=>(
            <div key={m.id} className="rounded-xl bg-white/[.045] p-3 text-sm">
              <div className="flex justify-between gap-2">
                <strong className="text-primary">{m.name}</strong>
                {host&&m.userId!==snapshot.me.id?
                <button type="button" disabled={busy}
                  onClick={()=>void action({action:'moderate',operation:'hide',targetId:m.userId,messageId:m.id})}
                  className="text-xs text-rose-300">{ar?'إخفاء':'Hide'}</button>:null}
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>
            </div>
          )):<p className="text-sm text-muted">{ar?'لسه مفيش رسائل.':'No messages yet.'}</p>}
        </div>
        {!snapshot.me.muted?<form className="mt-4 flex flex-wrap gap-2" onSubmit={e=>{
          e.preventDefault();if(!message.trim())return;
          void action({action:'message',body:message.trim()}).then(ok=>{if(ok)setMessage('');});
        }}>
          <label htmlFor="room-message" className="sr-only">{ar?'رسالتك':'Your message'}</label>
          <input id="room-message" className="input min-w-0 flex-1" required maxLength={300}
            value={message} onChange={e=>setMessage(e.target.value)} />
          <button type="submit" disabled={busy||!message.trim()}
            className="min-h-11 rounded-xl bg-primary px-4 text-sm text-white">
            {ar?'إرسال':'Send'}
          </button>
        </form>:<p className="mt-4 text-sm text-rose-300">{ar?'المضيف كتم رسائلك.':'Host muted your messages.'}</p>}
      </div>
      <aside className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <h2 className="text-lg font-bold">{ar?'المستمعون':'Listeners'} ({snapshot.members.length}/25)</h2>
        <div className="mt-4 space-y-3">{snapshot.members.map(member=>(
          <div key={member.id} className="space-y-2 rounded-xl border border-white/10 p-3 text-xs">
            <p className="truncate font-semibold">{member.name}
              {member.host?' ★':''} {member.active?'●':''}</p>
            {host&&!member.host?<div className="flex gap-3">
              <button type="button" disabled={busy} className="text-amber-300"
                onClick={()=>void action({action:'moderate',targetId:member.id,operation:member.muted?'unmute':'mute'})}>
                {member.muted?(ar?'إلغاء الكتم':'Unmute'):(ar?'كتم':'Mute')}
              </button>
              <button type="button" disabled={busy} className="text-rose-300"
                onClick={()=>void action({action:'moderate',targetId:member.id,operation:'kick'})}>
                {ar?'طرد':'Remove'}
              </button>
            </div>:null}
          </div>
        ))}</div>
      </aside>
    </section>
    {error?<p role="alert" className="text-sm text-rose-300">{error}</p>:null}
  </div>;
}
