import '@/shared/styles/main.scss';

import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import type { ReactNode } from 'react';

import { AppShell } from '@/features/app-shell';

import { StoreProvider } from './StoreProvider';

// Self-hosted at build time; `--font-main` is read by the Bootstrap font variable in shared/styles/_tokens.scss.
const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-main',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Inventory', template: '%s · Inventory' },
  description: 'Orders & Products SPA (Dzencode test task)',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={montserrat.variable}>
      <body>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
