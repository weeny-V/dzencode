import 'server-only';

import { type AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { type Locale, resolveLocale } from './config';
export async function MessageScope({
  load,
  children,
}: {
  load: (locale: Locale) => Promise<AbstractIntlMessages>;
  children: ReactNode;
}) {
  const locale = resolveLocale(await getLocale());
  return (
    <NextIntlClientProvider locale={locale} messages={await load(locale)}>
      {children}
    </NextIntlClientProvider>
  );
}
