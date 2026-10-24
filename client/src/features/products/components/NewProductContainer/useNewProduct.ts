'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';

import type { NewProduct } from '@/shared/api/types';
import { useMountedRef } from '@/shared/hooks/useMountedRef';
import { toQuery } from '@/shared/lib/searchParams';
import { useAppDispatch } from '@/shared/store/hooks';

import {
  createProduct,
  fetchOrderOptions,
  fetchProductTypes,
  selectOrderOptions,
  selectProductTypes,
} from '../../store/productsSlice';

/**
 * What the product form needs: the type names and the orders for its selects (loaded when the page opens), and
 * the way to send the product. The form is shown once both lists are here: a select that gets its options later
 * would lose its preset value. Once it is saved, the visitor lands on the panel of the product's order.
 */
export function useNewProduct() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const mounted = useMountedRef();

  // The names are shared by every visit and the thunk skips a second request, so it is not aborted on cleanup.
  useEffect(() => {
    void dispatch(fetchProductTypes());
  }, [dispatch]);
  useEffect(() => {
    const request = dispatch(fetchOrderOptions());
    return () => request.abort();
  }, [dispatch]);

  const types = useSelector(selectProductTypes);
  const orders = useSelector(selectOrderOptions);

  const retry = useCallback(() => {
    void dispatch(fetchProductTypes());
    void dispatch(fetchOrderOptions());
  }, [dispatch]);

  const create = useCallback(
    async (product: NewProduct): Promise<string | undefined> => {
      const result = await dispatch(createProduct(product));
      if (!createProduct.fulfilled.match(result))
        return result.error.message ?? 'Не удалось сохранить';

      // The product is saved. A visitor who left the form meanwhile (Cancel, another section) stays where they went.
      if (mounted.current)
        router.push(`/orders${toQuery({ order: String(result.payload.order) })}`);
      return undefined;
    },
    [dispatch, router, mounted],
  );

  // Data kept from an earlier visit is good enough for a select, so the form does not wait for the fresh answer.
  // A failure matters only while there is nothing to show.
  const error =
    !types.data && types.status === 'failed'
      ? types.error
      : !orders.data && orders.status === 'failed'
        ? orders.error
        : undefined;

  return { types: types.data, orders: orders.data, error, retry, create };
}
