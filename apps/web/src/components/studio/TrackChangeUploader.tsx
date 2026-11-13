'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';

export function TrackChangeUploader({trackId}:{trackId:string}){
 const [busy,setBusy]=useState<'srt'|'artwork'|null>(null);
 const [message,setMessage]=useState('');
 const [dragging,setDragging]=useState(false);
 const router=useRouter();
 async function send(kind:'srt'|'artwork',file:File|undefined){
  if(!file||busy)return;
  if(kind==='srt'&&(!/\.srt$/i.test(file.name)||file.size>256*1024||!file.size)){
   setMessage('Please choose a valid .srt file (maximum 256 KB).');return;
  }
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
 return <div className="flex w-full flex-wrap items-start gap-3 text-xs">
  <label
   onDragEnter={event=>{event.preventDefault();event.stopPropagation();if(!busy)setDragging(true)}}
   onDragOver={event=>{event.preventDefault();event.stopPropagation();if(!busy){event.dataTransfer.dropEffect='copy';setDragging(true)}}}
   onDragLeave={event=>{event.preventDefault();event.stopPropagation();if(!event.currentTarget.contains(event.relatedTarget as Node))setDragging(false)}}
   onDrop={event=>{event.preventDefault();event.stopPropagation();setDragging(false);if(!busy)void send('srt',event.dataTransfer.files[0])}}
   className={`flex min-h-24 min-w-52 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-center transition ${dragging?'border-fuchsia-300 bg-fuchsia-500/25 text-white':'border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200 hover:border-fuchsia-300 hover:bg-fuchsia-500/20'} ${busy?'pointer-events-none opacity-60':''}`}
  >
   <span className="text-sm font-bold">{busy==='srt'?'Uploading SRT…':dragging?'Drop your SRT file here':'Drag & drop SRT lyrics here'}</span>
   <span className="text-[11px] opacity-80">or click to browse · .srt only · max 256 KB</span>
   <input type="file" accept=".srt" className="sr-only" disabled={busy!==null} onChange={event=>{void send('srt',event.target.files?.[0]);event.target.value=''}}/>
  </label>
  <label className="cursor-pointer rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 font-semibold text-cyan-200 hover:bg-cyan-500/20">
   {busy==='artwork'?'Uploading…':'Change cover artwork'}
   <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy!==null} onChange={event=>{void send('artwork',event.target.files?.[0]);event.target.value=''}}/>
  </label>
  {message?<p role="status" className="w-full text-muted">{message}</p>:null}
 </div>
}
