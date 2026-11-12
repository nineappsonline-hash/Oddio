'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { SessionUser } from '@ai-music/contracts';

interface SessionContextValue {
  user: SessionUser | null;
}

const SessionContext = createContext<SessionContextValue>({ user: null });

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={{ user }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
