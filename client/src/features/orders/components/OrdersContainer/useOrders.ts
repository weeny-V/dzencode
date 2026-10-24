'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useCallback, useDeferredValue, useEffect } from 'react';
import { useSelector } from 'react-redux';

import type { OrderSummary, Product } from '@/shared/api/types';
import { useDialogTarget } from '@/shared/hooks/useDialogTarget';
import { useLatestRef } from '@/shared/hooks/useLatestRef';
import { useMountedRef } from '@/shared/hooks/useMountedRef';
import { useAppDispatch } from '@/shared/store/hooks';

import {
  fetchOrder,
  fetchOrders,
  selectOrderDetails,
  selectOrdersList,
} from '../../store/ordersSlice';
import { hrefAfterOrderDeleted, type PageContext } from './afterDelete';
import { panelView } from './panelView';

/**
 * Keeps the store in step with the address: loads the list for the search text and, when a panel is open,
 * the order behind it. A request that is no longer wanted (the text changed, the page was left) is aborted.
 * Returns what the orders page shows.
 */
export function useOrders(selectedId: number | undefined, query: string) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const orderDialog = useDialogTarget<OrderSummary>();
  const productDialog = useDialogTarget<Product>();

  useEffect(() => {
    const request = dispatch(fetchOrders(query));
    return () => request.abort();
  }, [dispatch, query]);

  useEffect(() => {
    if (selectedId === undefined) return;
    const request = dispatch(fetchOrder(selectedId));
    return () => request.abort();
  }, [dispatch, selectedId]);

  const retryList = useCallback(() => void dispatch(fetchOrders(query)), [dispatch, query]);
  const retryPanel = useCallback(() => {
    if (selectedId !== undefined) void dispatch(fetchOrder(selectedId));
  }, [dispatch, selectedId]);

  // A deletion can finish after the visitor moved on (another order, another search, another page). What to do
  // next is decided from the address as it is when the answer comes, and only while this page is still open.
  const context = useLatestRef<PageContext>({ selectedId, query });
  const mounted = useMountedRef();

  // The list drops a deleted order by itself (the slice). If its panel is open now, the panel goes too.
  const onOrderDeleted = useCallback(
    (id: number) => {
      const href = mounted.current ? hrefAfterOrderDeleted(id, context.current) : undefined;
      if (href !== undefined) startTransition(() => router.replace(href, { scroll: false }));
    },
    [router, context, mounted],
  );
  // A product left its order: the open panel, and the count and the totals of the rows, need fresh numbers.
  const onProductDeleted = useCallback(() => {
    if (!mounted.current) return;
    const { selectedId: openId, query: search } = context.current;
    if (openId !== undefined) void dispatch(fetchOrder(openId));
    void dispatch(fetchOrders(search));
  }, [dispatch, context, mounted]);

  const list = useSelector(selectOrdersList);
  const details = useSelector(selectOrderDetails);

  // A store update is never a transition, so React would not animate the rows it adds or removes. A deferred
  // value follows the store in a low-priority render, and that is what <ViewTransition> reacts to.
  const orders = useDeferredValue(list.data);

  return {
    orders,
    refreshing: list.status === 'loading' && list.data !== undefined,
    error: list.status === 'failed' ? (list.error ?? '') : undefined,
    retryList,
    panel: panelView(selectedId, details),
    retryPanel,
    deletion: { order: orderDialog, product: productDialog, onOrderDeleted, onProductDeleted },
  };
}
