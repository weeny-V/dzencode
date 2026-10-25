import '@/shared/styles/main.scss';

import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { LocalizedAppShell } from '@/features/app-shell';

import { dictionary as errorDictionary } from './error/messages.server';
import { text as rootText } from './root/messages.server';
import { StoreProvider } from './StoreProvider';

// Self-hosted at build time; `--font-main` is read by the Bootstrap font variable in shared/styles/_tokens.scss.
const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-main',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await rootText();
  return {
    title: { default: 'Inventory', template: '%s · Inventory' },
    description: t('description'),
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const errors = await errorDictionary();
  return (
    <html lang={locale} className={montserrat.variable}>
      <body>
        <StoreProvider>
          <LocalizedAppShell>
            <NextIntlClientProvider locale={locale} messages={{ ErrorPage: errors.messages }}>
              {children}
            </NextIntlClientProvider>
          </LocalizedAppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
