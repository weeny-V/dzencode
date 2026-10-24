import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

import type { Product } from '@/shared/api/types';

import { getProducts, getProductTypes } from '../api/products';
import { fetchProducts, fetchProductTypes, productsReducer } from './productsSlice';

vi.mock('../api/products');

const getProductsMock = vi.mocked(getProducts);
const getProductTypesMock = vi.mocked(getProductTypes);

const makeStore = () => configureStore({ reducer: { products: productsReducer } });

const product = (id: number) => ({ id, title: `Product ${id}` }) as Product;

describe('products list', () => {
  it('loads the table for a type and a search text', async () => {
    getProductsMock.mockResolvedValueOnce([product(1)]);
    const store = makeStore();

    const request = store.dispatch(fetchProducts({ type: 'Monitors', query: 'dell' }));
    expect(store.getState().products.list.status).toBe('loading');
    await request;

    expect(getProductsMock).toHaveBeenCalledWith(
      { type: 'Monitors', query: 'dell' },
      expect.any(AbortSignal),
    );
    expect(store.getState().products.list).toMatchObject({
      status: 'succeeded',
      data: [product(1)],
    });
  });

  it('keeps the previous rows while the next filter loads and reports a failure', async () => {
    getProductsMock.mockResolvedValueOnce([product(1)]);
    const store = makeStore();
    await store.dispatch(fetchProducts({ type: '', query: '' }));

    getProductsMock.mockRejectedValueOnce(new Error('500 Internal Server Error'));
    await store.dispatch(fetchProducts({ type: 'Monitors', query: '' }));

    expect(store.getState().products.list).toMatchObject({
      status: 'failed',
      error: '500 Internal Server Error',
      data: [product(1)],
    });
  });
});

describe('product types', () => {
  it('loads the names once: later requests are skipped', async () => {
    getProductTypesMock.mockResolvedValue(['Keyboards', 'Monitors']);
    const store = makeStore();

    await store.dispatch(fetchProductTypes());
    await store.dispatch(fetchProductTypes());

    expect(getProductTypesMock).toHaveBeenCalledTimes(1);
    expect(store.getState().products.types.data).toEqual(['Keyboards', 'Monitors']);
  });

  it('does not start a second request while the first one is running', async () => {
    getProductTypesMock.mockClear();
    getProductTypesMock.mockResolvedValue(['Monitors']);
    const store = makeStore();

    const first = store.dispatch(fetchProductTypes());
    const second = store.dispatch(fetchProductTypes());
    await Promise.all([first, second]);

    expect(getProductTypesMock).toHaveBeenCalledTimes(1);
  });

  it('tries again after a failure', async () => {
    getProductTypesMock.mockClear();
    getProductTypesMock.mockRejectedValueOnce(new Error('Failed to fetch'));
    getProductTypesMock.mockResolvedValueOnce(['Monitors']);
    const store = makeStore();

    await store.dispatch(fetchProductTypes());
    expect(store.getState().products.types.status).toBe('failed');
    await store.dispatch(fetchProductTypes());

    expect(store.getState().products.types).toMatchObject({
      status: 'succeeded',
      data: ['Monitors'],
    });
  });
});
