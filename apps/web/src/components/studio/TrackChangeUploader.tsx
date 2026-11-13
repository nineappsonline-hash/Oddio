'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export function TrackChangeUploader({trackId}:{trackId:string}){
 const [busy,setBusy]=useState<'srt'|'artwork'|null>(null);
 const [message,setMessage]=useState('');
 const router=useRouter();
 async function send(kind:'srt'|'artwork',file:File|undefined){
  if(!file)return;
  setBusy(kind);setMessage('');
  try{
   const form=new FormData();form.set('kind',kind);form.set('file',file);
   const response=await fetch('/api/studio/tracks/'+encodeURIComponent(trackId)+'/changes',{method:'POST',body:form});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error?.message||'Upload failed');
   setMessage('Submitted for admin approval. The current version stays live until approved.');
   router.refresh();
  }catch(error){setMessage(error instanceof Error?error.message:'Upload failed')}finally{setBusy(null)}
 }
 return <div className="flex flex-wrap items-center gap-2 text-xs">
  <label className="cursor-pointer rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-2 font-semibold text-fuchsia-200 hover:bg-fuchsia-500/20">
   {busy==='srt'?'Uploading…':'Upload synced lyrics (.srt)'}
   <input type="file" accept=".srt,text/plain" className="sr-only" disabled={busy!==null} onChange={e=>{void send('srt',e.target.files?.[0]);e.target.value=''}}/>
  </label>
  <label className="cursor-pointer rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 font-semibold text-cyan-200 hover:bg-cyan-500/20">
   {busy==='artwork'?'Uploading…':'Change cover artwork'}
   <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy!==null} onChange={e=>{void send('artwork',e.target.files?.[0]);e.target.value=''}}/>
  </label>
  {message?<p role="status" className="w-full text-muted">{message}</p>:null}
 </div>
}
