'use client';

import { type RefObject, useEffect, useState } from 'react';

import { useAuthSession } from '@/shared/hooks/useAuthSession';

/**
 * Loads a heavy visualization runtime only when its container becomes visible, mounts it once, and cleans up on
 * unmount. The load is bounded, retryable and ignored after the page or the authenticated session is gone.
 * `mount` must be stable (memoized by its inputs): a new function remounts the visualization.
 */
export function useDeferredRuntime<Runtime>(
  container: RefObject<HTMLElement | null>,
  load: () => Promise<Runtime>,
  mount: (runtime: Runtime) => () => void,
) {
  const session = useAuthSession();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const target = container.current;
    if (!target) return;
    let active = true;
    let started = false;
    let dispose: (() => void) | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const fail = () => {
      if (active) {
        active = false;
        dispose?.();
        if (session.isCurrent()) setStatus('error');
      }
    };
    const run = async () => {
      if (started || !session.isCurrent()) return;
      started = true;
      deadline = setTimeout(fail, 12_000);
      try {
        const runtime = await load();
        if (!active || !session.isCurrent()) return;
        dispose = mount(runtime);
        clearTimeout(deadline);
        setStatus('ready');
      } catch {
        clearTimeout(deadline);
        fail();
      }
    };
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? undefined
        : new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              observer?.disconnect();
              void run();
            }
          });
    if (observer) observer.observe(target);
    else void run();
    return () => {
      active = false;
      clearTimeout(deadline);
      observer?.disconnect();
      dispose?.();
    };
  }, [container, load, mount, attempt, session]);
  return {
    status,
    retry: () => {
      if (!session.isCurrent()) return;
      setStatus('loading');
      setAttempt((value) => value + 1);
    },
  };
}
