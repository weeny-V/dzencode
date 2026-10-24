'use client';

import { useCallback } from 'react';

import { useDeletion } from '@/shared/hooks/useDeletion';
import { useAppDispatch } from '@/shared/store/hooks';

import { deleteProduct } from '../../store/productsSlice';

/** Deletes a product through the store. `close` also forgets an old failure, so the next window starts clean. */
export function useDeleteProduct(onClose: () => void, onDeleted: (id: number) => void) {
  const dispatch = useAppDispatch();

  const remove = useCallback(
    async (id: number): Promise<string | undefined> => {
      const result = await dispatch(deleteProduct(id));
      return deleteProduct.fulfilled.match(result) ? undefined : (result.error.message ?? '');
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
