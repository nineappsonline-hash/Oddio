'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/client-api';
import { useLocalePath } from '@/lib/use-locale-path';

export function LogoutButton() {
  const router = useRouter();
  const { locale } = useLocalePath();

  async function onClick() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    router.push(`/${locale}`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-danger/10 hover:text-danger"
    >
      <LogOut className="h-4 w-4" />
      Log out
    </button>
  );
}
