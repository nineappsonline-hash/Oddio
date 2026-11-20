'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/client-api';

export function PlaylistCollaboration({
  playlistId,
  locale,
  isOwner,
}: {
  playlistId: string;
  locale: 'ar' | 'en';
  isOwner: boolean;
}) {
  const ar = locale === 'ar';
  const router = useRouter();
  const [code, setCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [members, setMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [invites, setInvites] = useState<
    Array<{
      id: string;
      expiresAt: string;
      uses: number;
      maxUses: number;
      revoked: boolean;
    }>
  >([]);
  async function refreshManagement() {
    if (!isOwner) return;
    try {
      const data = await apiRequest<{ members: typeof members; invites: typeof invites }>(
        `/api/playlists/collaboration?playlistId=${encodeURIComponent(playlistId)}`,
      );
      setMembers(data.members);
      setInvites(data.invites);
    } catch {
      /* Management panel is optional when API is unavailable. */
    }
  }
  useEffect(() => {
    void refreshManagement();
  }, [isOwner, playlistId]);
  async function manage(action: 'remove' | 'revoke', id: string) {
    if (
      !window.confirm(
        action === 'revoke'
          ? ar
            ? 'متأكد إنك عاوز تلغي الدعوة دي؟'
            : 'Revoke this invitation?'
          : ar
            ? 'متأكد إنك عاوز تشيل المحرر ده؟'
            : 'Remove this editor?',
      )
    )
      return;
    setWorking(true);
    setMessage('');
    try {
      await apiRequest('/api/playlists/collaboration', {
        method: 'POST',
        body: JSON.stringify({
          action,
          playlistId,
          ...(action === 'remove' ? { userId: id } : { inviteId: id }),
        }),
      });
      await refreshManagement();
      setMessage(ar ? 'تم تحديث الصلاحيات.' : 'Permissions updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setWorking(false);
    }
  }

  async function run() {
    setWorking(true);
    setMessage('');
    try {
      if (isOwner) {
        const data = await apiRequest<{ code: string; expiresAt: string }>(
          '/api/playlists/collaboration',
          {
            method: 'POST',
            body: JSON.stringify({ action: 'invite', playlistId }),
          },
        );
        setInviteCode(data.code);
        void refreshManagement();
        setExpiresAt(data.expiresAt);
        setMessage(
          ar
            ? 'انسخ رمز الدعوة وشاركه مع اللي تختاره.'
            : 'Copy this private invitation code to share with an editor.',
        );
      } else {
        const data = await apiRequest<{ playlistId: string }>(
          '/api/playlists/collaboration',
          {
            method: 'POST',
            body: JSON.stringify({
              action: 'join',
              playlistId,
              code: code.trim().toLowerCase(),
            }),
          },
        );
        if (data.playlistId !== playlistId) {
          setMessage(
            ar
              ? 'الدعوة دي لقائمة مختلفة.'
              : 'This invitation belongs to a different playlist.',
          );
        } else {
          setMessage(
            ar ? 'بقيت مشارك في تعديل القائمة.' : 'You can now help edit this playlist.',
          );
          setCode('');
          router.refresh();
        }
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to update collaboration.',
      );
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
          <button
            type="button"
            disabled={working}
            onClick={() => void run()}
            className="mt-3 min-h-10 rounded-xl bg-primary px-4 text-sm font-bold text-white"
          >
            {ar ? 'إنشاء رمز دعوة' : 'Create invitation code'}
          </button>
          {members.length ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold">
                {ar ? 'المحررون' : 'Editors'} ({members.length}/10)
              </p>
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/10 p-2 text-xs"
                >
                  <span className="truncate">{member.name}</span>
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => void manage('remove', member.id)}
                    className="shrink-0 text-rose-300"
                  >
                    {ar ? 'إزالة' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {invites.filter(
            (i) => !i.revoked && new Date(i.expiresAt).getTime() > Date.now(),
          ).length ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold">
                {ar ? 'الدعوات النشطة' : 'Active invitations'}
              </p>
              {invites
                .filter((i) => !i.revoked && new Date(i.expiresAt).getTime() > Date.now())
                .map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between gap-2 text-xs text-muted"
                  >
                    <span>
                      {i.uses}/{i.maxUses} ·{' '}
                      {new Date(i.expiresAt).toLocaleDateString(locale)}
                    </span>
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => void manage('revoke', i.id)}
                      className="text-rose-300"
                    >
                      {ar ? 'إلغاء الدعوة' : 'Revoke'}
                    </button>
                  </div>
                ))}
            </div>
          ) : null}
          {inviteCode ? (
            <div className="mt-3 space-y-2">
              <p className="break-all rounded-lg border border-white/10 p-3 font-mono text-xs">
                {inviteCode}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void navigator.clipboard.writeText(inviteCode).then(
                      () =>
                        setMessage(ar ? 'تم نسخ رمز الدعوة.' : 'Invitation code copied.'),
                      () =>
                        setMessage(
                          ar
                            ? 'النسخ غير متاح. انسخ الرمز يدويًا.'
                            : 'Clipboard unavailable. Copy the code manually.',
                        ),
                    )
                  }
                  className="min-h-11 rounded-lg border border-white/20 px-3 py-2 text-xs"
                >
                  {ar ? 'نسخ الرمز' : 'Copy code'}
                </button>
                <button
                  type="button"
                  onClick={() => setInviteCode('')}
                  className="min-h-11 rounded-lg border border-white/20 px-3 py-2 text-xs"
                >
                  {ar ? 'إخفاء الرمز' : 'Hide code'}
                </button>
              </div>
              <p className="text-xs text-muted">
                {ar
                  ? 'الرمز بيظهر مرة واحدة. لو قفلت الصفحة مش هتقدر تشوفه تاني.'
                  : 'The code is shown only once. You cannot retrieve it after leaving this page.'}
              </p>
              <p className="text-xs text-muted">
                {ar ? 'صالح حتى' : 'Expires'}{' '}
                {new Date(expiresAt).toLocaleDateString(locale)}
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex-1 text-xs text-muted">
            {ar ? 'رمز الدعوة' : 'Invitation code'}
            <input
              type="text"
              autoComplete="off"
              maxLength={64}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="input mt-1 w-full font-mono text-xs"
            />
          </label>
          <button
            type="button"
            disabled={working || !/^[a-f0-9]{64}$/i.test(code.trim())}
            onClick={() => void run()}
            className="min-h-10 rounded-xl bg-primary px-4 text-xs font-bold text-white disabled:opacity-40"
          >
            {ar ? 'انضم كمحرر' : 'Join as editor'}
          </button>
        </div>
      )}
      {message ? (
        <p role="status" className="mt-2 text-xs text-muted">
          {message}
        </p>
      ) : null}
    </details>
  );
}
