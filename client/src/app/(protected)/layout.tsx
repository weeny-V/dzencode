import type { ReactNode } from 'react';

import { LocalizedAppShell } from '@/features/app-shell';
import { AuthGate } from '@/features/auth';

import { ErrorMessages } from '../error/ErrorMessages.server';
import { StoreProvider } from '../StoreProvider';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <StoreProvider>
        <LocalizedAppShell>
          <ErrorMessages>{children}</ErrorMessages>
        </LocalizedAppShell>
      </StoreProvider>
    </AuthGate>
  );
}
