'use client';

import { useCallback, useDeferredValue, useEffect } from 'react';
import { useSelector } from 'react-redux';

import { useAppDispatch } from '@/shared/store/hooks';

import { parseType } from '../../searchParams';
import {
  fetchProducts,
  fetchProductTypes,
  selectProductsList,
  selectProductTypes,
} from '../../store/productsSlice';

/**
 * Keeps the store in step with the address: loads the type names once and the table for the type and the
 * search text. A request that is no longer wanted (the filter changed, the page was left) is aborted.
 * Returns what the products page shows.
 */
export function useProducts(typeParam: string, query: string) {
  const dispatch = useAppDispatch();

  // Not aborted on cleanup: the names are shared by every visit, and the thunk skips a second request.
  useEffect(() => {
    void dispatch(fetchProductTypes());
  }, [dispatch]);

  const typesSlot = useSelector(selectProductTypes);
  const types = typesSlot.data;
  // Until the names are known the address is trusted as it is (the API ignores letter case). Afterwards an
  // unknown type means "all", so the select and the table never disagree.
  const type = types ? parseType(typeParam, types) : typeParam;

  useEffect(() => {
    const request = dispatch(fetchProducts({ type, query }));
    return () => request.abort();
  }, [dispatch, type, query]);

  const retryTypes = useCallback(() => void dispatch(fetchProductTypes()), [dispatch]);
  // The names are asked for again too: they may have failed together with the table. The thunk skips the
  // request when they are loaded or on their way.
  const retry = useCallback(() => {
    retryTypes();
    void dispatch(fetchProducts({ type, query }));
  }, [dispatch, retryTypes, type, query]);

  const list = useSelector(selectProductsList);
  // A store update is never a transition, so React would not animate the rows it adds or removes. A deferred
  // value follows the store in a low-priority render, and that is what <ViewTransition> reacts to.
  const products = useDeferredValue(list.data);

  return {
    products,
    refreshing: list.status === 'loading' && list.data !== undefined,
    error: list.status === 'failed' ? (list.error ?? '') : undefined,
    retry,
    types,
    typesFailed: typesSlot.status === 'failed',
    retryTypes,
    selectedType: type,
  };
}
