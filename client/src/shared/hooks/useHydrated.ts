'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/** False while the server HTML is on the screen and until React has taken it over; true afterwards. */
export const useHydrated = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
