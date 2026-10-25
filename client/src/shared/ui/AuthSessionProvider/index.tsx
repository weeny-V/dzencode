'use client';

import { createContext, type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { SessionIdentity } from '@/shared/api/authTypes';
import { authGeneration } from '@/shared/lib/authLifecycle';

export interface AuthLifetime extends SessionIdentity {
  isCurrent: () => boolean;
}
export const AuthSessionContext = createContext<AuthLifetime | null>(null);

/** Only non-credential identity crosses the server/client boundary. Remount this provider per session. */
export function AuthSessionProvider({
  identity,
  children,
}: {
  identity: SessionIdentity;
  children: ReactNode;
}) {
  const [generation] = useState(authGeneration);
  const active = useRef<string | null>(identity.sessionId);
  useLayoutEffect(() => {
    active.current = identity.sessionId;
    return () => {
      active.current = null;
    };
  }, [identity.sessionId]);
  const value = useMemo<AuthLifetime>(
    () => ({
      userId: identity.userId,
      sessionId: identity.sessionId,
      isCurrent: () => active.current === identity.sessionId && generation === authGeneration(),
    }),
    [identity.userId, identity.sessionId, generation],
  );
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}
