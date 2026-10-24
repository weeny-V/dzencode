'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import type { NewOrder } from '@/shared/api/types';
import { useMountedRef } from '@/shared/hooks/useMountedRef';
import { toQuery } from '@/shared/lib/searchParams';
import { useAppDispatch } from '@/shared/store/hooks';

import { createOrder } from '../../store/ordersSlice';

/**
 * Sends a new order and, once it is saved, opens its panel on the orders page. The answer tells the form what went
 * wrong: the text of the failure, or `undefined` when the order is saved and the visitor is on the way out.
 */
export function useNewOrder() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const mounted = useMountedRef();

  return useCallback(
    async (order: NewOrder): Promise<string | undefined> => {
      const result = await dispatch(createOrder(order));
      if (!createOrder.fulfilled.match(result))
        return result.error.message ?? 'Не удалось сохранить';

      // The order is saved. A visitor who left the form meanwhile (Cancel, another section) stays where they went.
      if (mounted.current) router.push(`/orders${toQuery({ order: String(result.payload.id) })}`);
      return undefined;
    },
    [dispatch, router, mounted],
  );
}
