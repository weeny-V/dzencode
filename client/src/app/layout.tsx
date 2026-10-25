import '@/shared/styles/main.scss';

import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { ServiceWorkerRegistration } from '@/features/pwa';

import { dictionary as errorDictionary } from './error/messages.server';
import { text as rootText } from './root/messages.server';

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
    icons: { apple: '/icons/apple-touch-icon.png' },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The brand green of shared/styles/_tokens.scss ($color-primary) colors the browser bar of an installed app.
  themeColor: '#89c049',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const errors = await errorDictionary();
  return (
    <html lang={locale} className={montserrat.variable}>
      <body>
        <NextIntlClientProvider locale={locale} messages={{ ErrorPage: errors.messages }}>
          {children}
        </NextIntlClientProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
