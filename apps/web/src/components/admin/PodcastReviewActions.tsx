'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function PodcastReviewActions({episodeId,locale}:{episodeId:string;locale:'ar'|'en'}) {
  const router=useRouter();
  const ar=locale==='ar';
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function decide(decision:'approve'|'reject') {
    if(decision==='reject'&&!reason.trim()){setError(ar?'اكتب سبب الرفض':'Please enter a rejection reason');return;}
    setBusy(true);setError('');
    try {
      const response=await fetch('/api/admin/podcasts/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({episodeId,decision,reason})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Could not save decision');
      router.refresh();
    } catch(e) {setError(e instanceof Error?e.message:String(e));}
    finally {setBusy(false);}
  }
  return <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
    <label className="block text-xs text-[#aaa]">{ar?'سبب الرفض (مطلوب عند الرفض)':'Rejection reason (required to reject)'}
      <textarea rows={2} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}
        placeholder={ar?'وضح للفنان المطلوب تعديله':'Explain what the creator should change'} className="mt-2 w-full rounded-xl border border-white/15 bg-[#30253c] p-3 text-sm text-white"/>
    </label>
    {error?<p role="alert" className="text-xs text-red-300">{error}</p>:null}
    <div className="flex flex-wrap gap-3">
      <button disabled={busy} type="button" onClick={()=>decide('approve')} className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{ar?'موافقة ونشر':'Approve & publish'}</button>
      <button disabled={busy} type="button" onClick={()=>decide('reject')} className="rounded-xl bg-rose-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{ar?'رفض الحلقة':'Reject episode'}</button>
    </div>
  </div>;
}