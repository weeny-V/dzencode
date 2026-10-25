import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrderSummary } from '@/shared/api/types';
import type { ActionResult } from '@/shared/lib/actionResult';
import { deferred, order } from '@/testing/fixtures';
import { navigation } from '@/testing/navigation';

import { useNewOrder } from './useNewOrder';

const mocks = vi.hoisted(() => ({ createOrder: vi.fn() }));
vi.mock('../../actions', () => mocks);
vi.mock('next/navigation', async () => (await import('@/testing/navigation')).navigationMock);
beforeEach(() => vi.clearAllMocks());
describe('useNewOrder', () => {
  it('opens the saved order', async () => {
    mocks.createOrder.mockResolvedValue({ ok: true, data: order });
    const { result } = renderHook(useNewOrder);
    await act(async () => {
      await result.current({ title: 'New', description: null });
    });
    expect(navigation.push).toHaveBeenCalledWith('/orders?order=7');
  });
  it('does not redirect after leaving the form during a save', async () => {
    const response = deferred<ActionResult<OrderSummary>>();
    mocks.createOrder.mockReturnValue(response.promise);
    const { result, unmount } = renderHook(useNewOrder);
    const save = result.current({ title: 'New', description: null });
    unmount();
    response.resolve({ ok: true, data: order });
    expect(await save).toBeUndefined();
    expect(navigation.push).not.toHaveBeenCalled();
  });
  it('returns transport errors to the form', async () => {
    mocks.createOrder.mockRejectedValue(new Error('Connection lost'));
    const { result } = renderHook(useNewOrder);
    expect(await result.current({ title: 'New', description: null })).toBe('Connection lost');
    expect(navigation.push).not.toHaveBeenCalled();
  });
});
