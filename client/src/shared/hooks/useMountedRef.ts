'use client';

import { useEffect, useRef } from 'react';

/**
 * A ref that is `true` while the component is on screen. Check it after an `await` before something that moves
 * the visitor (a redirect): they may have left the page while the request was running. Written in an effect, so
 * it also survives React's development double run (mount, cleanup, mount).
 */
export function useMountedRef() {
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return mounted;
}
