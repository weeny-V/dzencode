'use client';

import { useSyncExternalStore } from 'react';

const MINUTE = 60_000;

// The clock shows minutes, so the snapshot changes once a minute and React re-renders only then,
// even though the timer ticks every second (that keeps the displayed minute at most a second late).
const subscribe = (onChange: () => void) => {
  const timer = setInterval(onChange, 1000);
  return () => clearInterval(timer);
};

const getSnapshot = (): number | null => Math.floor(Date.now() / MINUTE);

// The server does not know the visitor's time zone: render an empty clock there and fill it in the browser,
// so hydration never sees a different time than the one the server printed.
const getServerSnapshot = (): number | null => null;

/** The current time in the visitor's time zone, to the minute; `null` until the browser takes over. */
export function useClock(): Date | null {
  const minute = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return minute === null ? null : new Date(minute * MINUTE);
}
