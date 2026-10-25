import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Product } from '@/shared/api/types';
import type { ActionResult } from '@/shared/lib/actionResult';
import { deferred, product } from '@/testing/fixtures';
import { navigation } from '@/testing/navigation';

import { useNewProduct } from './useNewProduct';

const mocks = vi.hoisted(() => ({ createProduct: vi.fn() }));
vi.mock('../../actions', () => mocks);
vi.mock('next/navigation', async () => (await import('@/testing/navigation')).navigationMock);
beforeEach(() => vi.clearAllMocks());
describe('useNewProduct', () => {
  it('opens the parent returned by the server', async () => {
    mocks.createProduct.mockResolvedValue({ ok: true, data: product });
    const { result } = renderHook(useNewProduct);
    await result.current(product);
    expect(navigation.push).toHaveBeenCalledWith('/orders?order=7');
  });
  it('does not redirect when an abandoned form finishes saving', async () => {
    const response = deferred<ActionResult<Product>>();
    mocks.createProduct.mockReturnValue(response.promise);
    const { result, unmount } = renderHook(useNewProduct);
    const save = result.current(product);
    unmount();
    response.resolve({ ok: true, data: product });
    await save;
    expect(navigation.push).not.toHaveBeenCalled();
  });
});
