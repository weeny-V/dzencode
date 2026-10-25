import type { ReactNode } from 'react';

import { requireSession } from '@/shared/api/session.server';
import { AuthSessionProvider } from '@/shared/ui/AuthSessionProvider';

import { AuthLifecycle } from '../AuthLifecycle';

export async function AuthGate({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const identity = { userId: session.user.id, sessionId: session.sessionId };
  return (
    <AuthSessionProvider key={session.sessionId} identity={identity}>
      <AuthLifecycle identity={identity}>{children}</AuthLifecycle>
    </AuthSessionProvider>
  );
}
