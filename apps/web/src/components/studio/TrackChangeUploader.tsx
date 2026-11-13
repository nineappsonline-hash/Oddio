'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';

export function TrackChangeUploader({trackId,hasApprovedSrt=false}:{trackId:string;hasApprovedSrt?:boolean}){
 const [busy,setBusy]=useState<'srt'|'artwork'|'lyrics_text'|null>(null);
 const [lyricsText,setLyricsText]=useState('');
 const [showPaste,setShowPaste]=useState(false);
 const [message,setMessage]=useState('');
 const [dragging,setDragging]=useState(false);
 const router=useRouter();
 async function send(kind:'srt'|'artwork'|'lyrics_text',file?:File,action?:'remove'){
  if(busy)return;
  if(!file && kind!=='lyrics_text' && action!=='remove')return;
  if(kind==='srt'&&(!/\.srt$/i.test(file.name)||file.size>256*1024||!file.size)){
   setMessage('Please choose a valid .srt file (maximum 256 KB).');return;
  }
  setBusy(kind);setMessage('');
  try{
   const form=new FormData();form.set('kind',kind);if(file)form.set('file',file);if(action)form.set('action',action);if(kind==='lyrics_text')form.set('text',lyricsText);
   const response=await fetch('/api/studio/tracks/'+encodeURIComponent(trackId)+'/changes',{method:'POST',body:form});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error?.message||'Upload failed');
   setMessage('Request sent for admin approval. Existing lyrics remain unchanged until approved.');
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
  <div className="flex w-full flex-wrap items-center gap-2">
   <button type="button" onClick={()=>setShowPaste(value=>!value)} className="rounded-xl border border-fuchsia-400/40 px-3 py-2 font-semibold text-fuchsia-200 hover:bg-fuchsia-500/10">{showPaste?'Hide text editor':'Paste lyrics instead'}</button>
   {hasApprovedSrt?<button type="button" disabled={busy!==null} onClick={()=>{if(window.confirm('Request removal of the approved SRT lyrics? They will stay visible until an admin approves removal.'))void send('srt',undefined,'remove')}} className="rounded-xl border border-rose-400/40 px-3 py-2 font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50">Request SRT removal</button>:null}
  </div>
  {showPaste?<div className="w-full space-y-2"><label htmlFor={`lyrics-text-${trackId}`} className="block text-xs font-semibold text-ink">Paste song lyrics (without timestamps)</label><textarea id={`lyrics-text-${trackId}`} rows={7} maxLength={30000} value={lyricsText} onChange={event=>setLyricsText(event.target.value)} placeholder="Paste the song lyrics here…" className="w-full rounded-xl border border-white/20 bg-black/25 p-3 text-sm text-ink outline-none focus:border-fuchsia-400"/><p className="text-xs text-muted">Plain text lyrics are not time-synced. Admin approval is required before they appear.</p><button type="button" disabled={busy!==null||!lyricsText.trim()} onClick={()=>void send('lyrics_text')} className="rounded-xl bg-fuchsia-600 px-4 py-2 font-bold text-white disabled:opacity-50">Submit lyrics for approval</button></div>:null}
  {message?<p role="status" className="w-full text-muted">{message}</p>:null}
 </div>
}
