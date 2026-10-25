'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '../Button';

export function RetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="light-danger"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      Повторить
    </Button>
  );
}
