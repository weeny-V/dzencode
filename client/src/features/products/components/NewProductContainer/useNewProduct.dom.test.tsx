import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Product } from '@/shared/api/types';
import type { ActionResult } from '@/shared/lib/actionResult';
import { announceAuthChange } from '@/shared/lib/authLifecycle';
import { TestAuth } from '@/testing/auth';
import { deferred, product } from '@/testing/fixtures';
import { navigation } from '@/testing/navigation';

import { useNewProduct } from './useNewProduct';

const mocks = vi.hoisted(() => ({ createProduct: vi.fn() }));
vi.mock('../../actions', () => mocks);
vi.mock('next/navigation', async () => (await import('@/testing/navigation')).navigationMock);
beforeEach(() => vi.clearAllMocks());
describe('useNewProduct', () => {
  it('does not send a request from an already-invalidated session', async () => {
    const { result } = renderHook(useNewProduct, { wrapper: TestAuth });
    void act(() => announceAuthChange());
    expect(await result.current(product)).toBe('Authentication changed');
    expect(mocks.createProduct).not.toHaveBeenCalled();
    expect(navigation.push).not.toHaveBeenCalled();
  });
  it('ignores a successful response when authentication changes while saving', async () => {
    const response = deferred<ActionResult<Product>>();
    mocks.createProduct.mockReturnValueOnce(response.promise);
    const { result } = renderHook(useNewProduct, { wrapper: TestAuth });
    const save = result.current(product);
    void act(() => announceAuthChange());
    response.resolve({ ok: true, data: product });
    expect(await save).toBe('Authentication changed');
    expect(navigation.push).not.toHaveBeenCalled();
  });
  it('opens the parent returned by the server', async () => {
    mocks.createProduct.mockResolvedValue({ ok: true, data: product });
    const { result } = renderHook(useNewProduct, { wrapper: TestAuth });
    await result.current(product);
    expect(navigation.push).toHaveBeenCalledWith('/orders?order=7');
  });
  it('does not redirect when an abandoned form finishes saving', async () => {
    const response = deferred<ActionResult<Product>>();
    mocks.createProduct.mockReturnValue(response.promise);
    const { result, unmount } = renderHook(useNewProduct, { wrapper: TestAuth });
    const save = result.current(product);
    unmount();
    response.resolve({ ok: true, data: product });
    await save;
    expect(navigation.push).not.toHaveBeenCalled();
  });
});
