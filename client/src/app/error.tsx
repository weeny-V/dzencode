'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { Button } from '@/shared/ui/Button';
import { NoticePage } from '@/shared/ui/NoticePage';

// The safety net for unexpected failures inside a page: the shell (top menu, sidebar) keeps working.
// Note: in this Next.js version the recovery callback is called `retry`.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations('ErrorPage');
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <NoticePage title={t('title')} text={t('text')}>
      <Button onClick={() => retry()}>{t('retry')}</Button>
    </NoticePage>
  );
}
