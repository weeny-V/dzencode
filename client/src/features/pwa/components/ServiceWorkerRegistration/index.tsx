'use client';

import { useServiceWorker } from './useServiceWorker';

/** Renders nothing; makes the app installable and gives it an offline page. */
export function ServiceWorkerRegistration() {
  useServiceWorker();
  return null;
}
