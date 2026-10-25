'use client';

import type { ReactNode } from 'react';

import type { SessionIdentity } from '@/shared/api/authTypes';

import { useAuthLifecycle } from './useAuthLifecycle';

/** Invalidation unmounts protected Redux/forms/dialogs/sockets before a fresh server navigation. */
export function AuthLifecycle({
  identity,
  children,
}: {
  identity: SessionIdentity | null;
  children: ReactNode;
}) {
  const invalidated = useAuthLifecycle(identity);
  return invalidated ? null : children;
}
