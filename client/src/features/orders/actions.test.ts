import { beforeEach, describe, expect, it, vi } from 'vitest';

import { order } from '@/testing/fixtures';

import { createOrder, deleteOrder } from './actions';

const mocks = vi.hoisted(() => ({
  postOrder: vi.fn(),
  removeOrder: vi.fn(),
  updateTag: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('next/cache', () => mocks);
vi.mock('./api/orders', () => ({
  ...mocks,
  ordersTag: 'orders',
  orderTag: (id: number) => `order:${id}`,
}));
beforeEach(() => vi.clearAllMocks());

describe('order actions', () => {
  it('creates and expires all affected tags without redirecting or refreshing', async () => {
    mocks.postOrder.mockResolvedValue(order);
    expect(await createOrder({ title: 'New', description: null })).toEqual({
      ok: true,
      data: order,
    });
    expect(mocks.updateTag.mock.calls).toEqual([
      ['orders'],
      ['order:7'],
      ['products'],
      ['statistics'],
    ]);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it('deletes, invalidates cascade products and refreshes', async () => {
    mocks.removeOrder.mockResolvedValue(undefined);
    expect(await deleteOrder(7)).toEqual({ ok: true, data: undefined });
    expect(mocks.removeOrder).toHaveBeenCalledWith(7);
    expect(mocks.updateTag.mock.calls).toEqual([
      ['orders'],
      ['order:7'],
      ['products'],
      ['statistics'],
    ]);
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
  it('returns errors and does not invalidate a failed mutation', async () => {
    mocks.removeOrder.mockRejectedValue(new Error('Order not found'));
    expect(await deleteOrder(7)).toEqual({ ok: false, error: 'Order not found' });
    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it.each([0, -1, 1.5, 2_147_483_648, NaN])(
    'rejects invalid id %s before calling REST',
    async (id) => {
      expect((await deleteOrder(id)).ok).toBe(false);
      expect(mocks.removeOrder).not.toHaveBeenCalled();
    },
  );
});

vi.mock('@/shared/api/session.server', async () => {
  const { testSession } = await import('@/testing/auth');
  return {
    readSession: vi.fn(() => Promise.resolve(testSession)),
    requireSession: vi.fn(() => Promise.resolve(testSession)),
    redirectToLogin: vi.fn(() => {
      throw new Error('NEXT_REDIRECT');
    }),
  };
});
