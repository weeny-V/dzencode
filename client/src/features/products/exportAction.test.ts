import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadProductsExport } from './actions';

const mocks = vi.hoisted(() => ({ getProducts: vi.fn(), getProductTypes: vi.fn() }));
vi.mock('next/cache', () => ({ updateTag: vi.fn(), refresh: vi.fn() }));
vi.mock('./api/products', () => ({ ...mocks, productsTag: 'products' }));
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
  mocks.getProducts.mockResolvedValue([{ id: 1 }]);
  mocks.getProductTypes.mockResolvedValue(['Monitors', 'Laptops']);
});

describe('products export action', () => {
  it('reads every product of the type and search, matching the type like the page does', async () => {
    expect(await loadProductsExport('monitors', ' ultra ')).toEqual({
      ok: true,
      data: [{ id: 1 }],
    });
    expect(mocks.getProducts).toHaveBeenCalledWith({ type: 'Monitors', query: 'ultra' });
  });
  it('exports all products for an unknown type, as the page shows them', async () => {
    await loadProductsExport('Nope', '');
    expect(mocks.getProducts).toHaveBeenCalledWith({ type: '', query: '' });
  });
  it('skips the type lookup when no type is chosen', async () => {
    await loadProductsExport('', '');
    expect(mocks.getProductTypes).not.toHaveBeenCalled();
  });
  it.each([undefined, null, 7, {}, ['a']])('treats the input %j as no filter', async (input) => {
    await loadProductsExport(input, input);
    expect(mocks.getProducts).toHaveBeenCalledWith({ type: '', query: '' });
  });
  it('returns a failure instead of throwing when the API is down', async () => {
    mocks.getProducts.mockRejectedValue(new Error('Offline'));
    expect(await loadProductsExport('', '')).toEqual({ ok: false, error: 'Offline' });
  });
});
