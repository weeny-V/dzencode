import { beforeEach, describe, expect, it, vi } from 'vitest';

import { expireInventory } from './actions';

const mocks = vi.hoisted(() => ({
  updateTag: vi.fn(),
  requireSession: vi.fn(),
}));
vi.mock('next/cache', () => ({ updateTag: mocks.updateTag }));
vi.mock('@/shared/api/session.server', () => ({ requireSession: mocks.requireSession }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireSession.mockResolvedValue({ token: 'test-token' });
});

describe('expireInventory', () => {
  it('expires the tags of a valid batch once each', async () => {
    const result = await expireInventory([
      { type: 'product.created', productId: 1, orderId: 4 },
      { type: 'product.deleted', productId: 2, orderId: 4 },
    ]);
    expect(result).toEqual({ ok: true });
    expect(mocks.updateTag.mock.calls.map(([tag]) => tag as string).sort()).toEqual(
      ['order:4', 'orders', 'products', 'statistics'].sort(),
    );
  });
  it('requires a session before it touches the cache', async () => {
    mocks.requireSession.mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(expireInventory([{ type: 'resync' }])).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });
  it.each([null, 'resync', [], [{ type: 'nope' }], [{ type: 'order.deleted', orderId: 'x' }]])(
    'rejects the malformed input %j without expiring anything',
    async (input) => {
      expect(await expireInventory(input)).toEqual({ ok: false });
      expect(mocks.updateTag).not.toHaveBeenCalled();
    },
  );
});
