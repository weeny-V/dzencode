import './AuthShell.scss';

import Link from 'next/link';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import { localeMessages, LocaleSwitcher } from '@/features/locale';
import { getDictionary } from '@/shared/i18n/server';
import { ShieldLogo } from '@/shared/ui/icons';

import { AuthLifecycle } from '../AuthLifecycle';

export async function AuthShell({ children }: { children: ReactNode }) {
  const { locale, messages } = await getDictionary(localeMessages);
  return (
    <AuthLifecycle identity={null}>
      <div className="auth-shell">
        <header className="auth-shell__header">
          <Link href="/login" className="auth-shell__brand">
            <ShieldLogo className="auth-shell__logo" />
            Inventory
          </Link>
          <NextIntlClientProvider locale={locale} messages={{ LocaleSwitcher: messages }}>
            <LocaleSwitcher />
          </NextIntlClientProvider>
        </header>
        <main className="auth-shell__content">{children}</main>
      </div>
    </AuthLifecycle>
  );
}
