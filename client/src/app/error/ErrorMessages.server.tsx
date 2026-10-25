import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import { dictionary } from './messages.server';

/** A shell's provider replaces its parent messages; keep route errors directly around its children. */
export async function ErrorMessages({ children }: { children: ReactNode }) {
  const { locale, messages } = await dictionary();
  return (
    <NextIntlClientProvider locale={locale} messages={{ ErrorPage: messages }}>
      {children}
    </NextIntlClientProvider>
  );
}
