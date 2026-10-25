'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import type { NewProduct } from '@/shared/api/types';
import { useAuthSession } from '@/shared/hooks/useAuthSession';
import { useMountedRef } from '@/shared/hooks/useMountedRef';
import { actionResult } from '@/shared/lib/actionResult';
import { recoverAuthentication } from '@/shared/lib/authRecovery';
import { toQuery } from '@/shared/lib/searchParams';

import { createProduct } from '../../actions';

/** Options arrive from the server; this hook only submits and navigates while the form is mounted. */
export function useNewProduct() {
  const router = useRouter();
  const session = useAuthSession();
  const mounted = useMountedRef();
  return useCallback(
    async (product: NewProduct): Promise<string | undefined> => {
      // Check before sending and after await: authentication may change while saving.
      if (!session.isCurrent()) return 'Authentication changed';
      const response = await actionResult(() => createProduct(product, session.sessionId));
      if (!session.isCurrent()) return 'Authentication changed';
      if (!response.ok) return response.error;
      const result = response.data;
      if (mounted.current && recoverAuthentication(result)) return 'Authentication required';
      if (!result.ok) return result.error;
      if (mounted.current) router.push(`/orders${toQuery({ order: String(result.data.order) })}`);
      return undefined;
    },
    [router, mounted, session],
  );
}
