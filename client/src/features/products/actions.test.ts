import { beforeEach, describe, expect, it, vi } from 'vitest';

import { product } from '@/testing/fixtures';

import { createProduct, deleteProduct } from './actions';

const mocks = vi.hoisted(() => ({
  postProduct: vi.fn(),
  removeProduct: vi.fn(),
  updateTag: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('next/cache', () => mocks);
vi.mock('./api/products', () => ({ ...mocks, productsTag: 'products' }));
beforeEach(() => vi.clearAllMocks());

describe('product actions', () => {
  it('creates and invalidates the actual parent returned by REST', async () => {
    mocks.postProduct.mockResolvedValue(product);
    const { id: _id, orderTitle: _orderTitle, date: _date, ...body } = product;
    expect((await createProduct(body)).ok).toBe(true);
    expect(mocks.updateTag.mock.calls).toEqual([['products'], ['orders'], ['order:7']]);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it('deletes and refreshes lists and parent totals', async () => {
    mocks.removeProduct.mockResolvedValue(undefined);
    expect((await deleteProduct(9, 7)).ok).toBe(true);
    expect(mocks.removeProduct).toHaveBeenCalledWith(9);
    expect(mocks.updateTag.mock.calls).toEqual([['products'], ['orders'], ['order:7']]);
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
  it('keeps failed deletion retryable without invalidation', async () => {
    mocks.removeProduct.mockRejectedValue(new Error('API offline'));
    expect(await deleteProduct(9, 7)).toEqual({ ok: false, error: 'API offline' });
    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it('validates the item and parent ids', async () => {
    expect((await deleteProduct(9, -7)).ok).toBe(false);
    expect((await deleteProduct(0, 7)).ok).toBe(false);
    expect(mocks.removeProduct).not.toHaveBeenCalled();
  });
});
