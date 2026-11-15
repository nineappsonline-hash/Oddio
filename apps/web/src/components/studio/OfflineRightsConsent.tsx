'use client';

import { useState } from 'react';
import { apiRequest } from '@/lib/client-api';

export function OfflineRightsConsent({
  trackId,
  locale,
  initiallyAllowed,
}: {
  trackId: string;
  locale: 'ar' | 'en';
  initiallyAllowed: boolean;
}) {
  const ar=locale==='ar';
  const [allowed,setAllowed]=useState(initiallyAllowed);
  const [confirmed,setConfirmed]=useState(false);
  const [pending,setPending]=useState(false);
  const [message,setMessage]=useState('');
  async function update(allow:boolean) {
    setPending(true);setMessage('');
    try {
      await apiRequest(`/api/studio/tracks/${trackId}/offline-rights`,{
        method:'PATCH',
        body:JSON.stringify({allowed:allow,rightsConfirmed:allow?confirmed:false}),
      });
      setAllowed(allow);
      setConfirmed(false);
      setMessage(ar?'تم تحديث موافقة الحقوق. التحميل أوفلاين لسه مش مفعّل.':
        'Rights consent updated. Offline downloads are not enabled yet.');
    } catch(error) {
      setMessage(error instanceof Error?error.message:'Unable to save');
    } finally {setPending(false);}
  }
  return <details className="w-full rounded-xl border border-white/10 p-3">
    <summary className="cursor-pointer text-xs font-semibold">
      {ar?'حقوق الاستماع بدون إنترنت':'Offline distribution rights'}
      {' · '}{allowed?(ar?'مسموح مستقبلاً':'Consent on file'):(ar?'غير مسموح':'Not permitted')}
    </summary>
    <p className="mt-2 text-xs leading-6 text-muted">
      {ar
        ? 'دي موافقة منفصلة على حق توزيع نسخ للاستماع بدون إنترنت، وليست تشغيلًا فوريًا للتحميل. تقدر تسحب الموافقة في أي وقت.'
        : 'This is an independent rights declaration for future offline delivery, not an active download feature. Consent can be revoked.'}
    </p>
    {!allowed?<label className="mt-3 flex items-start gap-2 text-xs leading-6">
      <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}
        className="mt-1 accent-primary" />
      {ar
        ? 'أؤكد إني أملك حق السماح بتنزيل الأغنية للاستماع بدون إنترنت، بما فيها أي عينات أو أصوات أو أعمال طرف تالت.'
        : 'I confirm I control offline distribution rights for this track, including all samples, voices and third-party works.'}
    </label>:null}
    <button type="button" disabled={pending||(!allowed&&!confirmed)}
      onClick={()=>void update(!allowed)}
      className="mt-3 min-h-10 rounded-xl border border-violet-400/30 px-3 text-xs font-semibold disabled:opacity-40">
      {pending?(ar?'جارٍ الحفظ…':'Saving…'):
        allowed?(ar?'سحب موافقة الأوفلاين':'Revoke consent'):
          (ar?'تسجيل الموافقة':'Record consent')}
    </button>
    {message?<p role="status" className="mt-2 text-xs text-muted">{message}</p>:null}
  </details>;
}
