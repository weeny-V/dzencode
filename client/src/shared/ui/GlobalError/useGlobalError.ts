import { useEffect, useState } from 'react';

import type { Locale } from '@/shared/i18n/config';
import { getSavedLocale } from '@/shared/i18n/localeAction';

import english from './messages/en.json';

/** Always keep a usable recovery screen, even when the failed server or a dictionary chunk is unavailable. */
export function useGlobalError() {
  const [content, setContent] = useState({ locale: 'en' as Locale, messages: english });
  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    async function run() {
      try {
        const locale = await Promise.race([
          getSavedLocale(),
          new Promise<Locale>((resolve) => {
            timeout = setTimeout(() => resolve('en'), 1500);
          }),
        ]);
        if (locale !== 'ru' || !active) return;
        const loaded = await import('./messages/ru.json');
        if (active) setContent({ locale, messages: loaded.default });
      } catch {
        // The English recovery controls remain available if localization fails.
      } finally {
        clearTimeout(timeout);
      }
    }
    void run();
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, []);
  return content;
}
