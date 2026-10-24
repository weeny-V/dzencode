import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

import type { OrderDetails, OrderSummary } from '@/shared/api/types';

import { getOrder, getOrders, postOrder, removeOrder } from '../api/orders';
import { createOrder, deleteOrder, fetchOrder, fetchOrders, ordersReducer } from './ordersSlice';

vi.mock('../api/orders');

const getOrdersMock = vi.mocked(getOrders);
const getOrderMock = vi.mocked(getOrder);
const postOrderMock = vi.mocked(postOrder);
const removeOrderMock = vi.mocked(removeOrder);

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

describe('creating an order', () => {
  it('sends the order and answers with the created one', async () => {
    postOrderMock.mockResolvedValueOnce(summary(5));
    const store = makeStore();

    const result = await store.dispatch(createOrder({ title: 'Order 5', description: null }));

    expect(postOrderMock).toHaveBeenCalledWith(
      { title: 'Order 5', description: null },
      expect.any(AbortSignal),
    );
    expect(createOrder.fulfilled.match(result) && result.payload).toEqual(summary(5));
  });

  it('answers with the reason when the API refuses', async () => {
    postOrderMock.mockRejectedValueOnce(new Error('title is required'));
    const store = makeStore();

    const result = await store.dispatch(createOrder({ title: '', description: null }));

    expect(createOrder.rejected.match(result) && result.error.message).toBe('title is required');
  });
});

describe('deleting an order', () => {
  const withRows = async () => {
    getOrdersMock.mockResolvedValueOnce([summary(3), summary(2), summary(1)]);
    getOrderMock.mockResolvedValueOnce(details(2));
    const store = makeStore();
    await store.dispatch(fetchOrders(''));
    await store.dispatch(fetchOrder(2));
    return store;
  };

  it('drops the order from the list and from the panel', async () => {
    const store = await withRows();
    removeOrderMock.mockResolvedValueOnce();

    await store.dispatch(deleteOrder(2));

    expect(removeOrderMock).toHaveBeenCalledWith(2, expect.any(AbortSignal));
    expect(store.getState().orders.list.data?.map((order) => order.id)).toEqual([3, 1]);
    expect(store.getState().orders.details.data).toBeUndefined();
  });

  it('keeps the panel of another order', async () => {
    const store = await withRows();
    removeOrderMock.mockResolvedValueOnce();

    await store.dispatch(deleteOrder(3));

    expect(store.getState().orders.details.data?.id).toBe(2);
  });

  it('keeps everything when the API refuses', async () => {
    const store = await withRows();
    removeOrderMock.mockRejectedValueOnce(new Error('Order not found'));

    const result = await store.dispatch(deleteOrder(2));

    expect(deleteOrder.rejected.match(result) && result.error.message).toBe('Order not found');
    expect(store.getState().orders.list.data).toHaveLength(3);
    expect(store.getState().orders.details.data?.id).toBe(2);
  });
});

describe('a request that was already on its way when an order was deleted', () => {
  it('does not bring the deleted order back into the list', async () => {
    getOrdersMock.mockResolvedValueOnce([summary(3), summary(2), summary(1)]);
    const store = makeStore();
    await store.dispatch(fetchOrders(''));

    // A reload starts, then order 2 is deleted, then the reload answers with the rows it saw before.
    const late = deferred<OrderSummary[]>();
    getOrdersMock.mockReturnValueOnce(late.promise);
    const reload = store.dispatch(fetchOrders(''));
    removeOrderMock.mockResolvedValueOnce();
    await store.dispatch(deleteOrder(2));
    late.resolve([summary(3), summary(2), summary(1)]);
    await reload;

    expect(store.getState().orders.list.data?.map((order) => order.id)).toEqual([3, 1]);
    expect(store.getState().orders.list.status).toBe('succeeded');
  });

  it('does not show the deleted order in the panel when its answer comes late', async () => {
    const late = deferred<OrderDetails>();
    getOrderMock.mockReturnValueOnce(late.promise);
    const store = makeStore();
    const request = store.dispatch(fetchOrder(2));

    removeOrderMock.mockResolvedValueOnce();
    await store.dispatch(deleteOrder(2));
    late.resolve(details(2));
    await request;

    expect(store.getState().orders.details.data).toBeUndefined();
  });
});
