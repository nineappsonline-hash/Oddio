'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/client-api';

export function PlaylistCollaboration({
  playlistId, locale, isOwner,
}: { playlistId: string; locale: 'ar' | 'en'; isOwner: boolean }) {
  const ar = locale === 'ar';
  const router = useRouter();
  const [code, setCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  async function run() {
    setWorking(true);
    setMessage('');
    try {
      if (isOwner) {
        const data = await apiRequest<{ code: string; expiresAt: string }>(
          '/api/playlists/collaboration', {
            method: 'POST',
            body: JSON.stringify({ action: 'invite', playlistId }),
          });
        setInviteCode(data.code);
        setExpiresAt(data.expiresAt);
        setMessage(ar ? 'انسخ رمز الدعوة وشاركه مع اللي تختاره.' : 'Copy this private invitation code to share with an editor.');
      } else {
        const data = await apiRequest<{ playlistId: string }>(
          '/api/playlists/collaboration', {
            method: 'POST',
            body: JSON.stringify({ action: 'join', code: code.trim().toLowerCase() }),
          });
        if (data.playlistId !== playlistId) {
          setMessage(ar ? 'الدعوة دي لقائمة مختلفة.' : 'This invitation belongs to a different playlist.');
        } else {
          setMessage(ar ? 'بقيت مشارك في تعديل القائمة.' : 'You can now help edit this playlist.');
          setCode('');
          router.refresh();
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update collaboration.');
    } finally {
      setWorking(false);
    }
  }
  return (
    <details className="mt-4 rounded-xl border border-violet-400/20 bg-white/[.035] p-4">
      <summary className="cursor-pointer text-sm font-bold">
        {ar ? 'تعاون على الـPlaylist' : 'Collaborate on this playlist'}
      </summary>
      <p className="mt-2 text-xs leading-5 text-muted">
        {ar
          ? 'التعاون متاح للقوائم العامة فقط. المدعو يقدر يضيف أو يشيل أغاني منشورة، لكن ملكية القائمة والإعدادات بتفضل لصاحبها.'
          : 'Public playlists only. Invited editors may add or remove available tracks, but only the owner controls playlist settings.'}
      </p>
      {isOwner ? (
        <>
          <button type="button" disabled={working} onClick={() => void run()}
            className="mt-3 min-h-10 rounded-xl bg-primary px-4 text-sm font-bold text-white">
            {ar ? 'إنشاء رمز دعوة' : 'Create invitation code'}
          </button>
          {inviteCode ? (
            <div className="mt-3 space-y-2">
              <p className="break-all rounded-lg border border-white/10 p-3 font-mono text-xs">{inviteCode}</p>
              <button type="button" onClick={() => void navigator.clipboard.writeText(inviteCode)}
                className="rounded-lg border border-white/20 px-3 py-2 text-xs">
                {ar ? 'نسخ الرمز' : 'Copy code'}
              </button>
              <p className="text-xs text-muted">
                {ar ? 'صالح حتى' : 'Expires'} {new Date(expiresAt).toLocaleDateString(locale)}
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex-1 text-xs text-muted">
            {ar ? 'رمز الدعوة' : 'Invitation code'}
            <input type="text" autoComplete="off" maxLength={64} value={code}
              onChange={(event) => setCode(event.target.value)}
              className="input mt-1 w-full font-mono text-xs" />
          </label>
          <button type="button" disabled={working || !/^[a-f0-9]{64}$/i.test(code.trim())}
            onClick={() => void run()}
            className="min-h-10 rounded-xl bg-primary px-4 text-xs font-bold text-white disabled:opacity-40">
            {ar ? 'انضم كمحرر' : 'Join as editor'}
          </button>
        </div>
      )}
      {message ? <p role="status" className="mt-2 text-xs text-muted">{message}</p> : null}
    </details>
  );
}
