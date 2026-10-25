'use client';

import { useEffect, useState } from 'react';

import type { SessionIdentity } from '@/shared/api/authTypes';
import { actionResult } from '@/shared/lib/actionResult';
import {
  authGeneration,
  invalidateAuth,
  listenAuthChanges,
  subscribeAuthInvalidation,
} from '@/shared/lib/authLifecycle';
import { reloadAfterAuth } from '@/shared/lib/authNavigation';

import { inspectSession } from '../../actions';

export function useAuthLifecycle(identity: SessionIdentity | null) {
  const [invalidated, setInvalidated] = useState(false);
  useEffect(() => subscribeAuthInvalidation(() => setInvalidated(true)), []);
  useEffect(() => listenAuthChanges(() => reloadAfterAuth()), []);
  useEffect(() => {
    let disposed = false;
    const check = async () => {
      const generation = authGeneration();
      const response = await actionResult(inspectSession);
      if (disposed || generation !== authGeneration() || !response.ok || !response.data.ok) return;
      if ((response.data.data?.sessionId ?? null) !== (identity?.sessionId ?? null)) {
        invalidateAuth();
        reloadAfterAuth();
      }
    };
    const visible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    const focus = () => {
      void check();
    };
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) {
        invalidateAuth();
        reloadAfterAuth();
      }
    };
    window.addEventListener('pageshow', restored);
    window.addEventListener('focus', focus);
    window.addEventListener('inventory:auth:check', focus);
    document.addEventListener('visibilitychange', visible);
    return () => {
      disposed = true;
      window.removeEventListener('pageshow', restored);
      window.removeEventListener('focus', focus);
      window.removeEventListener('inventory:auth:check', focus);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [identity?.sessionId]);
  return invalidated;
}
