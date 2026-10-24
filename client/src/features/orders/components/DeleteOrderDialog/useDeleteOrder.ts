'use client';

import { useCallback } from 'react';

import { useDeletion } from '@/shared/hooks/useDeletion';
import { useAppDispatch } from '@/shared/store/hooks';

import { deleteOrder } from '../../store/ordersSlice';

/** Deletes an order through the store. `close` also forgets an old failure, so the next window starts clean. */
export function useDeleteOrder(onClose: () => void, onDeleted: (id: number) => void) {
  const dispatch = useAppDispatch();

  const remove = useCallback(
    async (id: number): Promise<string | undefined> => {
      const result = await dispatch(deleteOrder(id));
      return deleteOrder.fulfilled.match(result) ? undefined : (result.error.message ?? '');
    },
    [dispatch],
  );

  const { pending, error, confirm, reset } = useDeletion(
    remove,
    useCallback(
      (id: number, stillOpen: boolean) => {
        // A window opened for another item meanwhile is not ours to close.
        if (stillOpen) onClose();
        onDeleted(id);
      },
      [onClose, onDeleted],
    ),
  );

  const close = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  return { pending, error, confirm, close };
}
