import type { ReactNode } from 'react';

import { requireSession } from '@/shared/api/session.server';

/** Page content must authorize again when Next reuses the protected layout during navigation. */
export async function ProtectedPage({ children }: { children: ReactNode }) {
  await requireSession();
  return children;
}
