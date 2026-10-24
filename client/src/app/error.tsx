'use client';

import { useEffect } from 'react';

import { Button } from '@/shared/ui/Button';
import { NoticePage } from '@/shared/ui/NoticePage';

// The safety net for unexpected failures inside a page: the shell (top menu, sidebar) keeps working.
// Note: in this Next.js version the recovery callback is called `retry`.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <NoticePage
      title="Что-то пошло не так"
      text="Страницу не удалось показать. Попробуйте ещё раз."
    >
      <Button onClick={() => retry()}>Повторить</Button>
    </NoticePage>
  );
}
