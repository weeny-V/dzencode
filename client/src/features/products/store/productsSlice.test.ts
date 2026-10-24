import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

import type { Product } from '@/shared/api/types';

import {
  getOrderOptions,
  getProducts,
  getProductTypes,
  postProduct,
  removeProduct,
} from '../api/products';
import {
  createProduct,
  deleteProduct,
  fetchOrderOptions,
  fetchProducts,
  fetchProductTypes,
  productsReducer,
} from './productsSlice';

vi.mock('../api/products');

const getProductsMock = vi.mocked(getProducts);
const getProductTypesMock = vi.mocked(getProductTypes);
const getOrderOptionsMock = vi.mocked(getOrderOptions);
const postProductMock = vi.mocked(postProduct);
const removeProductMock = vi.mocked(removeProduct);

const makeStore = () => configureStore({ reducer: { products: productsReducer } });

/** A promise that the test settles by hand, to control the order in which answers arrive. */
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

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

describe('order options', () => {
  it('loads the orders for the select again on every request', async () => {
    getOrderOptionsMock.mockResolvedValue([{ id: 2, title: 'Order 2' }]);
    const store = makeStore();

    await store.dispatch(fetchOrderOptions());
    await store.dispatch(fetchOrderOptions());

    expect(getOrderOptionsMock).toHaveBeenCalledTimes(2);
    expect(store.getState().products.orderOptions).toMatchObject({
      status: 'succeeded',
      data: [{ id: 2, title: 'Order 2' }],
    });
  });

  it('reports a failure', async () => {
    getOrderOptionsMock.mockRejectedValueOnce(new Error('Failed to fetch'));
    const store = makeStore();

    await store.dispatch(fetchOrderOptions());

    expect(store.getState().products.orderOptions).toMatchObject({
      status: 'failed',
      error: 'Failed to fetch',
    });
  });
});

describe('creating a product', () => {
  const body = {
    title: 'Monitor',
    serialNumber: 1,
    isNew: true,
    photo: null,
    type: 'Monitors',
    specification: null,
    guarantee: { start: '2017-06-29', end: '2019-06-29' },
    price: [{ value: 1, symbol: 'UAH', isDefault: true }],
    order: 2,
  };

  it('sends the product and answers with the created one', async () => {
    postProductMock.mockResolvedValueOnce(product(9));
    const store = makeStore();

    const result = await store.dispatch(createProduct(body));

    expect(postProductMock).toHaveBeenCalledWith(body, expect.any(AbortSignal));
    expect(createProduct.fulfilled.match(result) && result.payload).toEqual(product(9));
  });

  it('answers with the reason when the API refuses', async () => {
    postProductMock.mockRejectedValueOnce(new Error('Unknown order: 2'));
    const store = makeStore();

    const result = await store.dispatch(createProduct(body));

    expect(createProduct.rejected.match(result) && result.error.message).toBe('Unknown order: 2');
  });
});

describe('deleting a product', () => {
  it('drops the product from the table', async () => {
    getProductsMock.mockResolvedValueOnce([product(1), product(2)]);
    removeProductMock.mockResolvedValueOnce();
    const store = makeStore();
    await store.dispatch(fetchProducts({ type: '', query: '' }));

    await store.dispatch(deleteProduct(1));

    expect(removeProductMock).toHaveBeenCalledWith(1, expect.any(AbortSignal));
    expect(store.getState().products.list.data).toEqual([product(2)]);
  });

  it('keeps the table when the API refuses', async () => {
    getProductsMock.mockResolvedValueOnce([product(1)]);
    removeProductMock.mockRejectedValueOnce(new Error('Product not found'));
    const store = makeStore();
    await store.dispatch(fetchProducts({ type: '', query: '' }));

    const result = await store.dispatch(deleteProduct(1));

    expect(deleteProduct.rejected.match(result) && result.error.message).toBe('Product not found');
    expect(store.getState().products.list.data).toEqual([product(1)]);
  });
});

describe('a request that was already on its way when a product was deleted', () => {
  it('does not bring the deleted product back into the table', async () => {
    getProductsMock.mockResolvedValueOnce([product(1), product(2)]);
    const store = makeStore();
    await store.dispatch(fetchProducts({ type: '', query: '' }));

    const late = deferred<Product[]>();
    getProductsMock.mockReturnValueOnce(late.promise);
    const reload = store.dispatch(fetchProducts({ type: '', query: '' }));
    removeProductMock.mockResolvedValueOnce();
    await store.dispatch(deleteProduct(1));
    late.resolve([product(1), product(2)]);
    await reload;

    expect(store.getState().products.list.data).toEqual([product(2)]);
    expect(store.getState().products.list.status).toBe('succeeded');
  });
});
