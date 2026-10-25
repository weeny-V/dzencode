'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/shared/ui/Button';

import { useLogout } from './useLogout';

export function LogoutButton() {
  const t = useTranslations('AuthForm');
  const { pending, failed, exit } = useLogout();
  return (
    <div>
      <Button variant="ghost" disabled={pending} onClick={() => void exit()}>
        {t(pending ? 'pending' : 'logout')}
      </Button>
      {failed && <span role="alert">{t('logoutFailed')}</span>}
    </div>
  );
}
