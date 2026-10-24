import { describe, expect, it } from 'vitest';

import type { OrderDetails } from '@/shared/api/types';

import type { OrdersState } from '../../store/ordersSlice';
import { panelView } from './panelView';

const order = (id: number): OrderDetails => ({
  id,
  title: `Order ${id}`,
  description: null,
  date: '2020-01-01T00:00:00.000Z',
  products: [],
});

const slot = (patch: Partial<OrdersState['details']>): OrdersState['details'] => ({
  status: 'idle',
  data: undefined,
  error: undefined,
  requestId: undefined,
  orderId: undefined,
  ...patch,
});

describe('panelView', () => {
  it('shows no panel when no order is open', () => {
    expect(panelView(undefined, slot({ status: 'succeeded', data: order(1), orderId: 1 }))).toBe(
      undefined,
    );
  });

  it('shows the order once it is loaded', () => {
    const view = panelView(1, slot({ status: 'succeeded', data: order(1), orderId: 1 }));

    expect(view).toEqual({ status: 'ready', order: order(1) });
  });

  it('keeps the loaded order on screen while it reloads', () => {
    const view = panelView(1, slot({ status: 'loading', data: order(1), orderId: 1 }));

    expect(view?.status).toBe('ready');
  });

  it('does not show the previous order while another one loads', () => {
    const view = panelView(2, slot({ status: 'loading', data: order(1), orderId: 2 }));

    expect(view).toEqual({ status: 'loading' });
  });

  it('shows the error of a failed reload instead of the order kept from an earlier load', () => {
    const view = panelView(
      1,
      slot({ status: 'failed', data: order(1), orderId: 1, error: 'Order not found' }),
    );

    expect(view).toEqual({ status: 'error', message: 'Order not found' });
  });

  it('ignores a failure that belongs to another order', () => {
    const view = panelView(2, slot({ status: 'failed', orderId: 1, error: 'boom' }));

    expect(view).toEqual({ status: 'loading' });
  });
});
