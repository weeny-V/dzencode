import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useState, useTransition } from 'react';

import type { Locale } from '@/shared/i18n/config';
import { actionResult } from '@/shared/lib/actionResult';

import { setLocale } from '../../actions';
export function useLocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const change = (next: Locale) => {
    if (next === locale || pending) return;
    setFailed(false);
    startTransition(async () => {
      const result = await actionResult(() => setLocale(next));
      if (result.ok) router.refresh();
      else setFailed(true);
    });
  };
  return { locale, pending, failed, change };
}
