import type { ReactNode } from 'react';

import { AuthSessionProvider } from '@/shared/ui/AuthSessionProvider';

export const testIdentity = { userId: 1, sessionId: 'a'.repeat(64) };
export const testSession = {
  ...testIdentity,
  token: 'test-token',
  user: {
    id: 1,
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    registeredAt: '2026-01-01T00:00:00Z',
  },
};
export function TestAuth({ children }: { children: ReactNode }) {
  return <AuthSessionProvider identity={testIdentity}>{children}</AuthSessionProvider>;
}
