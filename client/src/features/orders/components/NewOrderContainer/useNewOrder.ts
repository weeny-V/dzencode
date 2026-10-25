'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import type { NewOrder } from '@/shared/api/types';
import { useAuthSession } from '@/shared/hooks/useAuthSession';
import { useMountedRef } from '@/shared/hooks/useMountedRef';
import { actionResult } from '@/shared/lib/actionResult';
import { recoverAuthentication } from '@/shared/lib/authRecovery';
import { toQuery } from '@/shared/lib/searchParams';

import { createOrder } from '../../actions';

/**
 * Sends a new order and, once it is saved, opens its panel on the orders page. The answer tells the form what went
 * wrong: the text of the failure, or `undefined` when the order is saved and the visitor is on the way out.
 */
export function useNewOrder() {
  const router = useRouter();
  const session = useAuthSession();
  const mounted = useMountedRef();

  return useCallback(
    async (order: NewOrder): Promise<string | undefined> => {
      // Check before sending and after await: authentication may change while saving.
      if (!session.isCurrent()) return 'Authentication changed';
      const response = await actionResult(() => createOrder(order, session.sessionId));
      if (!session.isCurrent()) return 'Authentication changed';
      if (!response.ok) return response.error;
      const result = response.data;
      if (mounted.current && recoverAuthentication(result)) return 'Authentication required';
      if (!result.ok) return result.error;

      // The order is saved. A visitor who left the form meanwhile (Cancel, another section) stays where they went.
      if (mounted.current) router.push(`/orders${toQuery({ order: String(result.data.id) })}`);
      return undefined;
    },
    [router, mounted, session],
  );
}
