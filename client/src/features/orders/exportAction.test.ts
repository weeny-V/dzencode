import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadOrdersExport } from './actions';

const mocks = vi.hoisted(() => ({ getOrders: vi.fn(), getWarehouses: vi.fn() }));
vi.mock('next/cache', () => ({ updateTag: vi.fn(), refresh: vi.fn() }));
vi.mock('./api/orders', () => ({ ...mocks, ordersTag: 'orders', orderTag: () => 'order:1' }));
vi.mock('@/features/warehouses', () => ({ getWarehouses: mocks.getWarehouses }));
vi.mock('@/shared/api/session.server', async () => {
  const { testSession } = await import('@/testing/auth');
  return {
    requireSession: vi.fn(() => Promise.resolve(testSession)),
    readSession: vi.fn(() => Promise.resolve(testSession)),
    redirectToLogin: vi.fn(() => {
      throw new Error('NEXT_REDIRECT');
    }),
  };
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getOrders.mockResolvedValue([{ id: 1 }]);
  mocks.getWarehouses.mockResolvedValue([
    { id: 2, name: 'Kyiv', code: 'K', address: 'x', latitude: 1, longitude: 2 },
  ]);
});

describe('orders export action', () => {
  it('reads every order of the search and the warehouse names only', async () => {
    expect(await loadOrdersExport('  monitor ')).toEqual({
      ok: true,
      data: { orders: [{ id: 1 }], warehouses: [{ id: 2, name: 'Kyiv' }] },
    });
    expect(mocks.getOrders).toHaveBeenCalledWith('monitor');
  });
  it.each([undefined, null, 5, {}, ['a'], 'x'.repeat(101)])(
    'treats the input %j as no search',
    async (input) => {
      await loadOrdersExport(input);
      expect(mocks.getOrders).toHaveBeenCalledWith('');
    },
  );
  it('returns a failure instead of throwing when the API is down', async () => {
    mocks.getOrders.mockRejectedValue(new Error('Offline'));
    expect(await loadOrdersExport('')).toEqual({ ok: false, error: 'Offline' });
  });
});
