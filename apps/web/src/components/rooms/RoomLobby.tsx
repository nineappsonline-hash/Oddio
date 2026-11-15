'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/client-api';

export function RoomLobby({ locale }: { locale: 'ar' | 'en' }) {
  const ar = locale === 'ar';
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [roomId, setRoomId] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState('');

  async function submit(mode: 'create' | 'join') {
    setPending(true);
    setFeedback('');
    try {
      const result =
        mode === 'create'
          ? await apiRequest<{ roomId: string; code: string }>('/api/rooms', {
              method: 'POST',
              body: JSON.stringify({ action: 'create', title: title.trim() }),
            })
          : await apiRequest<{ roomId: string }>('/api/rooms', {
              method: 'POST',
              body: JSON.stringify({
                action: 'join',
                roomId: roomId.trim(),
                code: code.trim().toLowerCase(),
              }),
            });
      if ('code' in result) {
        // Display invitation separately, not as a query-string token.
        sessionStorage.setItem(`oddio-room-code:${result.roomId}`, result.code);
      }
      router.push(`/${locale}/rooms/${result.roomId}`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Room unavailable');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <form
        className="space-y-4 rounded-2xl border border-violet-400/20 bg-white/[.035] p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit('create');
        }}
      >
        <h2 className="text-xl font-bold">
          {ar ? 'اعمل غرفة استماع' : 'Host a listening room'}
        </h2>
        <p className="text-sm text-muted">
          {ar
            ? 'غرفة خاصة بالدعوة لمدة 6 ساعات، بحد أقصى 25 مستمع.'
            : 'Invite-only room for six hours, up to 25 listeners.'}
        </p>
        <label className="block text-xs text-muted" htmlFor="room-title">
          {ar ? 'اسم الغرفة' : 'Room name'}
        </label>
        <input
          id="room-title"
          className="input w-full"
          required
          minLength={3}
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Oddio Night"
        />
        <button
          type="submit"
          disabled={pending || title.trim().length < 3}
          className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-white disabled:opacity-40"
        >
          {ar ? 'إنشاء الغرفة' : 'Create room'}
        </button>
      </form>
      <form
        className="space-y-4 rounded-2xl border border-white/10 bg-white/[.035] p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit('join');
        }}
      >
        <h2 className="text-xl font-bold">
          {ar ? 'ادخل غرفة أصحابك' : 'Join a listening room'}
        </h2>
        <label className="block text-xs text-muted" htmlFor="room-id">
          {ar ? 'معرّف الغرفة' : 'Room ID'}
        </label>
        <input
          id="room-id"
          className="input w-full font-mono text-xs"
          required
          autoComplete="off"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <label className="block text-xs text-muted" htmlFor="room-code">
          {ar ? 'رمز الدعوة' : 'Invitation code'}
        </label>
        <input
          id="room-code"
          className="input w-full font-mono text-xs"
          required
          autoComplete="off"
          maxLength={64}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          type="submit"
          disabled={
            pending ||
            !/^[a-f0-9-]{36}$/i.test(roomId.trim()) ||
            !/^[a-f0-9]{64}$/i.test(code.trim())
          }
          className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-white disabled:opacity-40"
        >
          {ar ? 'انضم للغرفة' : 'Join room'}
        </button>
      </form>
      {feedback ? (
        <p role="alert" className="text-sm text-rose-300 md:col-span-2">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
