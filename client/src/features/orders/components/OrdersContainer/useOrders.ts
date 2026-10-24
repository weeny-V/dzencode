'use client';

import { useCallback, useDeferredValue, useEffect } from 'react';
import { useSelector } from 'react-redux';

import { useAppDispatch } from '@/shared/store/hooks';

import {
  fetchOrder,
  fetchOrders,
  selectOrderDetails,
  selectOrdersList,
} from '../../store/ordersSlice';
import { panelView } from './panelView';

/**
 * Keeps the store in step with the address: loads the list for the search text and, when a panel is open,
 * the order behind it. A request that is no longer wanted (the text changed, the page was left) is aborted.
 * Returns what the orders page shows.
 */
export function useOrders(selectedId: number | undefined, query: string) {
  const dispatch = useAppDispatch();

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
  };
}
