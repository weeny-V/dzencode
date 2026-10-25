import { act, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { invalidateAuth } from '@/shared/lib/authLifecycle';
import { publishInventoryChange } from '@/shared/lib/inventoryEvents';
import { TestAuth } from '@/testing/auth';
import { navigation } from '@/testing/navigation';

import { InventorySync } from './index';
import messages from './messages/en.json';
import { SYNC_DELAY_MS } from './useInventorySync';

const mocks = vi.hoisted(() => ({ expireInventory: vi.fn() }));
vi.mock('next/navigation', async () => (await import('@/testing/navigation')).navigationMock);
vi.mock('../../actions', () => ({ expireInventory: mocks.expireInventory }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.expireInventory.mockResolvedValue({ ok: true });
  navigation.pathname = '/orders';
  navigation.search = '';
});
afterEach(() => vi.useRealTimers());

const mount = () =>
  render(<InventorySync />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <NextIntlClientProvider locale="en" messages={{ InventorySync: messages }}>
        <TestAuth>{children}</TestAuth>
      </NextIntlClientProvider>
    ),
  });
const elapse = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe('inventory sync', () => {
  it('does nothing until something changes', async () => {
    mount();
    await elapse(5 * SYNC_DELAY_MS);
    expect(mocks.expireInventory).not.toHaveBeenCalled();
    expect(navigation.refresh).not.toHaveBeenCalled();
  });
  it('merges a burst into one cache expiry and one refresh', async () => {
    mount();
    act(() => {
      publishInventoryChange({ type: 'order.created', orderId: 4 });
      publishInventoryChange({ type: 'product.created', productId: 8, orderId: 4 });
    });
    await elapse(SYNC_DELAY_MS - 1);
    expect(mocks.expireInventory).not.toHaveBeenCalled();
    await elapse(1);
    expect(mocks.expireInventory).toHaveBeenCalledOnce();
    expect(mocks.expireInventory).toHaveBeenCalledWith([
      { type: 'order.created', orderId: 4 },
      { type: 'product.created', productId: 8, orderId: 4 },
    ]);
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });
  it('refreshes only after the cache has been expired', async () => {
    let finish!: (value: { ok: boolean }) => void;
    mocks.expireInventory.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    mount();
    act(() => publishInventoryChange({ type: 'resync' }));
    await elapse(SYNC_DELAY_MS);
    expect(navigation.refresh).not.toHaveBeenCalled();
    await act(() => {
      finish({ ok: true });
      return Promise.resolve();
    });
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });
  it('does not refresh when the server refuses the batch or the action fails', async () => {
    mount();
    mocks.expireInventory.mockResolvedValueOnce({ ok: false });
    act(() => publishInventoryChange({ type: 'resync' }));
    await elapse(SYNC_DELAY_MS);
    mocks.expireInventory.mockRejectedValueOnce(new Error('offline'));
    act(() => publishInventoryChange({ type: 'resync' }));
    await elapse(SYNC_DELAY_MS);
    expect(navigation.refresh).not.toHaveBeenCalled();
  });
  it('ignores changes after the authenticated session ended', async () => {
    mount();
    act(() => invalidateAuth());
    act(() => publishInventoryChange({ type: 'resync' }));
    await elapse(SYNC_DELAY_MS);
    expect(mocks.expireInventory).not.toHaveBeenCalled();
  });
  it('drops a pending batch on unmount', async () => {
    const view = mount();
    act(() => publishInventoryChange({ type: 'resync' }));
    view.unmount();
    await elapse(SYNC_DELAY_MS);
    expect(mocks.expireInventory).not.toHaveBeenCalled();
  });

  describe('an order panel left open', () => {
    it('closes with a notice when its order was deleted elsewhere, keeping the other search params', async () => {
      navigation.search = 'order=7&q=monitor';
      mount();
      act(() => publishInventoryChange({ type: 'order.deleted', orderId: 7 }));
      await elapse(SYNC_DELAY_MS);
      expect(navigation.replace).toHaveBeenCalledWith('/orders?q=monitor');
      expect(screen.getByRole('status')).toHaveTextContent(
        'This order was deleted in another tab.',
      );
      expect(navigation.refresh).toHaveBeenCalledOnce();
    });
    it('shows no notice when this tab has already closed the panel (its own deletion)', async () => {
      navigation.search = 'order=7';
      const view = mount();
      act(() => publishInventoryChange({ type: 'order.deleted', orderId: 7 }));
      // The tab's own flow navigates away before the batch is flushed.
      navigation.search = '';
      view.rerender(<InventorySync />);
      await elapse(SYNC_DELAY_MS);
      expect(navigation.replace).not.toHaveBeenCalled();
      expect(screen.queryByText(/deleted in another tab/)).not.toBeInTheDocument();
      expect(navigation.refresh).toHaveBeenCalledOnce();
    });
    it.each([
      { type: 'order.deleted' as const, orderId: 8 },
      { type: 'order.created' as const, orderId: 7 },
    ])('stays open for $type of order $orderId while 7 is shown', async (change) => {
      navigation.search = 'order=7';
      mount();
      act(() => publishInventoryChange(change));
      await elapse(SYNC_DELAY_MS);
      expect(navigation.replace).not.toHaveBeenCalled();
    });
    it('lets the visitor dismiss the notice, and hides it by itself', async () => {
      navigation.search = 'order=7';
      mount();
      act(() => publishInventoryChange({ type: 'order.deleted', orderId: 7 }));
      await elapse(SYNC_DELAY_MS);
      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
      expect(screen.queryByText(/deleted in another tab/)).not.toBeInTheDocument();
      act(() => publishInventoryChange({ type: 'order.deleted', orderId: 7 }));
      await elapse(SYNC_DELAY_MS);
      expect(screen.getByText(/deleted in another tab/)).toBeInTheDocument();
      await elapse(8000);
      expect(screen.queryByText(/deleted in another tab/)).not.toBeInTheDocument();
    });
  });
});
