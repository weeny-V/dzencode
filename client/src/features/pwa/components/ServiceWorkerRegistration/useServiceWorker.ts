'use client';

import { useEffect } from 'react';

import { env } from '@/shared/config/env';

/**
 * Registers the service worker (client/public/sw.js) once the page has loaded. Only in a production build and a
 * secure context (https or localhost): in development a cache would hide the changes being made.
 */
export function useServiceWorker() {
  useEffect(() => {
    if (!env.serviceWorkerEnabled || !('serviceWorker' in navigator) || !window.isSecureContext)
      return;
    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch {
        // Without a service worker the app works as before; nothing to tell the visitor.
      }
    };
    // Registering after the load event keeps the first visit's network free for the page itself.
    const onLoad = () => void register();
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
    return () => window.removeEventListener('load', onLoad);
  }, []);
}
