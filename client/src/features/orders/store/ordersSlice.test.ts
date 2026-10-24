import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

import type { OrderDetails, OrderSummary } from '@/shared/api/types';

import { getOrder, getOrders } from '../api/orders';
import { fetchOrder, fetchOrders, ordersReducer } from './ordersSlice';

vi.mock('../api/orders');

const getOrdersMock = vi.mocked(getOrders);
const getOrderMock = vi.mocked(getOrder);

const makeStore = () => configureStore({ reducer: { orders: ordersReducer } });

const summary = (id: number): OrderSummary => ({
  id,
  title: `Order ${id}`,
  description: null,
  date: '2020-01-01T00:00:00.000Z',
  productsCount: 0,
  totals: [],
});

const details = (id: number): OrderDetails => ({
  id,
  title: `Order ${id}`,
  description: null,
  date: '2020-01-01T00:00:00.000Z',
  products: [],
});

/** A promise that the test settles by hand, to control the order in which answers arrive. */
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('orders list', () => {
  it('loads the list for a search text', async () => {
    getOrdersMock.mockResolvedValueOnce([summary(1)]);
    const store = makeStore();

    const request = store.dispatch(fetchOrders('mon'));
    expect(store.getState().orders.list.status).toBe('loading');
    await request;

    expect(getOrdersMock).toHaveBeenCalledWith('mon', expect.any(AbortSignal));
    expect(store.getState().orders.list).toMatchObject({ status: 'succeeded', data: [summary(1)] });
  });

  it('keeps the previous rows while the next search loads', async () => {
    getOrdersMock.mockResolvedValueOnce([summary(1)]);
    const store = makeStore();
    await store.dispatch(fetchOrders(''));

    const next = deferred<OrderSummary[]>();
    getOrdersMock.mockReturnValueOnce(next.promise);
    const request = store.dispatch(fetchOrders('x'));

    expect(store.getState().orders.list).toMatchObject({ status: 'loading', data: [summary(1)] });
    next.resolve([]);
    await request;
    expect(store.getState().orders.list).toMatchObject({ status: 'succeeded', data: [] });
  });

  it('stores the message of a failed request and clears it on the next try', async () => {
    getOrdersMock.mockRejectedValueOnce(new Error('Failed to fetch'));
    const store = makeStore();

    await store.dispatch(fetchOrders(''));
    expect(store.getState().orders.list).toMatchObject({
      status: 'failed',
      error: 'Failed to fetch',
    });

    getOrdersMock.mockResolvedValueOnce([summary(1)]);
    await store.dispatch(fetchOrders(''));
    expect(store.getState().orders.list).toMatchObject({ status: 'succeeded', error: undefined });
  });

  it('ignores the answer of an older request that arrives last', async () => {
    const slow = deferred<OrderSummary[]>();
    getOrdersMock.mockReturnValueOnce(slow.promise);
    getOrdersMock.mockResolvedValueOnce([summary(2)]);
    const store = makeStore();

    const first = store.dispatch(fetchOrders('a'));
    await store.dispatch(fetchOrders('ab'));
    slow.resolve([summary(1)]);
    await first;

    expect(store.getState().orders.list.data).toEqual([summary(2)]);
  });

  it('goes back to idle when the only request is aborted', async () => {
    getOrdersMock.mockImplementationOnce(
      (_query, signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
        }),
    );
    const store = makeStore();

    const request = store.dispatch(fetchOrders(''));
    request.abort();
    await request;

    expect(store.getState().orders.list.status).toBe('idle');
  });
});

describe('order details', () => {
  it('remembers which order was asked for and stores the answer', async () => {
    getOrderMock.mockResolvedValueOnce(details(7));
    const store = makeStore();

    const request = store.dispatch(fetchOrder(7));
    expect(store.getState().orders.details).toMatchObject({ status: 'loading', orderId: 7 });
    await request;

    expect(store.getState().orders.details).toMatchObject({
      status: 'succeeded',
      orderId: 7,
      data: details(7),
    });
  });

  it('records a failure for the order that failed', async () => {
    getOrderMock.mockRejectedValueOnce(new Error('Order not found'));
    const store = makeStore();

    await store.dispatch(fetchOrder(9));

    expect(store.getState().orders.details).toMatchObject({
      status: 'failed',
      orderId: 9,
      error: 'Order not found',
    });
  });
});
