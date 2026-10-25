import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActionResult } from '@/shared/lib/actionResult';
import { deferred } from '@/testing/fixtures';
import { navigation } from '@/testing/navigation';
import { renderWithStore } from '@/testing/renderWithStore';

import { askDelete } from '../../store/confirmationSlice';
import { DeleteButton } from '../DeleteButton';
import { DeleteDialogHost } from './index';

vi.mock('next/navigation', async () => (await import('@/testing/navigation')).navigationMock);

const target = { kind: 'order' as const, id: 7, title: 'Order to remove', meta: '1 product' };
beforeEach(() => {
  vi.clearAllMocks();
  navigation.pathname = '/orders';
  navigation.search = 'order=7&q=monitor';
});

function setup(deleteOrder = vi.fn().mockResolvedValue({ ok: true, data: undefined })) {
  const deleteProduct = vi.fn().mockResolvedValue({ ok: true, data: undefined });
  const rendered = renderWithStore(
    <>
      <DeleteButton target={target} label="Delete order" />
      <DeleteDialogHost deleteOrder={deleteOrder} deleteProduct={deleteProduct} />
    </>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Delete order' }));
  return { ...rendered, deleteOrder, deleteProduct };
}

describe('DeleteDialogHost', () => {
  it('asks before deleting and closes the currently deleted panel while preserving search', async () => {
    const { store, deleteOrder } = setup();
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(deleteOrder).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    await waitFor(() => expect(store.getState().confirmation.open).toBe(false));
    expect(deleteOrder).toHaveBeenCalledWith(7);
    expect(navigation.replace).toHaveBeenCalledWith('/orders?q=monitor', { scroll: false });
    expect(document.querySelector('dialog')).toHaveAttribute('data-closing');
  });
  it('shows an API failure and retries without closing the window', async () => {
    const remove = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: 'API offline' })
      .mockResolvedValueOnce({ ok: true, data: undefined });
    const { store } = setup(remove);
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось удалить.');
    expect(store.getState().confirmation.open).toBe(true);
    const retry = await screen.findByRole('button', { name: 'Удалить' });
    await waitFor(() => expect(retry).toBeEnabled());
    fireEvent.click(retry);
    await waitFor(() => expect(store.getState().confirmation.open).toBe(false));
  });
  it('handles a Server Action transport failure in the dialog', async () => {
    setup(vi.fn().mockRejectedValue(new Error('Next offline')));
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось удалить.');
  });
  it('does not close a new target or replace another panel after a late success', async () => {
    const response = deferred<ActionResult<void>>();
    const { store, rerender, deleteOrder, deleteProduct } = setup(
      vi.fn().mockReturnValue(response.promise),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    fireEvent.click(screen.getByRole('button', { name: 'Отменить' }));
    navigation.search = 'order=8&q=other';
    rerender(<DeleteDialogHost deleteOrder={deleteOrder} deleteProduct={deleteProduct} />);
    void act(() => store.dispatch(askDelete({ ...target, id: 8, title: 'Another order' })));
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeEnabled();
    await act(async () => {
      response.resolve({ ok: true, data: undefined });
      await response.promise;
    });
    expect(store.getState().confirmation).toMatchObject({ open: true, target: { id: 8 } });
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it.each([target, { ...target, id: 8, title: 'Another order' }])(
    'keeps deletion of $title retryable while a cancelled request is still running',
    async (nextTarget) => {
      const first = deferred<ActionResult<void>>();
      const second = deferred<ActionResult<void>>();
      const remove = vi
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise)
        .mockResolvedValueOnce({ ok: false, error: 'Retry failed' });
      const { store } = setup(remove);
      fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
      expect(screen.getByRole('button', { name: 'Удаление…' })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: 'Отменить' }));
      void act(() => store.dispatch(askDelete(nextTarget)));
      const confirm = screen.getByRole('button', { name: 'Удалить' });
      expect(confirm).toBeEnabled();
      fireEvent.click(confirm);
      await waitFor(() => expect(remove).toHaveBeenNthCalledWith(2, nextTarget.id));
      expect(screen.getByRole('button', { name: 'Удаление…' })).toBeDisabled();

      await act(async () => {
        second.resolve({ ok: false, error: 'Current request failed' });
        await second.promise;
      });
      expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось удалить.');
      const retry = screen.getByRole('button', { name: 'Удалить' });
      expect(retry).toBeEnabled();
      fireEvent.click(retry);
      await waitFor(() => expect(remove).toHaveBeenNthCalledWith(3, nextTarget.id));
      expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось удалить.');

      await act(async () => {
        first.resolve({ ok: false, error: 'Cancelled request failed' });
        await first.promise;
      });
      expect(store.getState().confirmation).toMatchObject({
        open: true,
        target: { id: nextTarget.id },
      });
      expect(screen.getByRole('alert')).toHaveTextContent('Не удалось удалить.');
      expect(screen.getByRole('button', { name: 'Удалить' })).toBeEnabled();
    },
  );
  it('keeps the current request pending when a cancelled deletion finishes', async () => {
    const first = deferred<ActionResult<void>>();
    const second = deferred<ActionResult<void>>();
    const { store } = setup(
      vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    fireEvent.click(screen.getByRole('button', { name: 'Отменить' }));
    void act(() => store.dispatch(askDelete({ ...target, id: 8, title: 'Another order' })));
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

    await act(async () => {
      first.resolve({ ok: true, data: undefined });
      await first.promise;
    });
    expect(store.getState().confirmation).toMatchObject({ open: true, target: { id: 8 } });
    expect(screen.getByRole('button', { name: 'Удаление…' })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await act(async () => {
      second.resolve({ ok: false, error: 'Current request failed' });
      await second.promise;
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось удалить.');
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeEnabled();
  });
  it('sends the product parent id for cache invalidation', async () => {
    const { store, deleteProduct } = setup();
    void act(() =>
      store.dispatch(
        askDelete({ kind: 'product', id: 9, orderId: 7, title: 'Monitor', meta: 'SN-123' }),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    await waitFor(() => expect(deleteProduct).toHaveBeenCalledWith(9, 7));
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
