'use client';

import { useState } from 'react';

import { useAuthSession } from '@/shared/hooks/useAuthSession';
import { useMountedRef } from '@/shared/hooks/useMountedRef';
import { actionResult } from '@/shared/lib/actionResult';
import { announceAuthChange } from '@/shared/lib/authLifecycle';
import { navigateAfterAuth, reloadAfterAuth } from '@/shared/lib/authNavigation';

import { logout } from '../../actions';
import { serializeAuthMutation } from '../../api/coordination';

export function useLogout() {
  const session = useAuthSession();
  const mounted = useMountedRef();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const exit = async () => {
    if (pending) return;
    setPending(true);
    setFailed(false);
    const result = await actionResult(() =>
      serializeAuthMutation(async () => {
        if (!mounted.current || !session.isCurrent()) throw new Error('Authentication changed');
        const response = await logout(session.sessionId);
        if (response.ok || response.authenticationRequired) {
          const current = mounted.current && session.isCurrent();
          announceAuthChange();
          if (current && response.ok) navigateAfterAuth('/login');
          else reloadAfterAuth();
        }
        return response;
      }),
    );
    if (!mounted.current || !session.isCurrent()) return;
    if (!result.ok || (!result.data.ok && !result.data.authenticationRequired)) {
      setPending(false);
      setFailed(true);
      return;
    }
  };
  return { pending, failed, exit };
}
