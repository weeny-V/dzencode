'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { useDeletion } from '@/shared/hooks/useDeletion';
import { useLatestRef } from '@/shared/hooks/useLatestRef';
import { useMountedRef } from '@/shared/hooks/useMountedRef';
import { type ActionResult, actionResult } from '@/shared/lib/actionResult';
import { withParam } from '@/shared/lib/searchParams';
import { useAppDispatch } from '@/shared/store/hooks';

import { closeDelete, type DeleteTarget, selectConfirmation } from '../../store/confirmationSlice';

export interface DeleteActions {
  deleteOrder?: (id: number) => Promise<ActionResult<void>>;
  deleteProduct: (id: number, orderId: number) => Promise<ActionResult<void>>;
}

export function useDeleteDialog(actions: DeleteActions) {
  const { target, open } = useSelector(selectConfirmation);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const location = useLatestRef({ pathname, params });
  const mounted = useMountedRef();
  const [pendingOperation, setPendingOperation] = useState<{ target: DeleteTarget }>();

  const remove = async () => {
    if (!target) return 'No item selected';
    if (target.kind === 'order' && !actions.deleteOrder)
      return 'Order deletion is unavailable on this page';
    const transport = await actionResult(() =>
      target.kind === 'order'
        ? actions.deleteOrder!(target.id)
        : actions.deleteProduct(target.id, target.orderId),
    );
    if (!transport.ok) return transport.error;
    if (!transport.data.ok) return transport.data.error;
    // Read the address after the request: another panel or search may now be active.
    const current = location.current;
    if (
      mounted.current &&
      target.kind === 'order' &&
      current.pathname === '/orders' &&
      current.params.get('order') === String(target.id)
    ) {
      startTransition(() =>
        router.replace(`/orders${withParam(current.params, 'order', '')}`, { scroll: false }),
      );
    }
    return undefined;
  };

  const onDeleted = (_id: number, stillOpen: boolean) => {
    if (mounted.current && stillOpen) dispatch(closeDelete());
  };
  const deletion = useDeletion(remove, onDeleted);
  const { reset } = deletion;
  const close = useCallback(() => {
    setPendingOperation(undefined);
    reset();
    dispatch(closeDelete());
  }, [dispatch, reset]);

  // Invalidate a pending dialog operation when it is replaced or closed externally.
  useEffect(() => {
    reset();
  }, [target, open, reset]);
  useEffect(
    () => () => {
      dispatch(closeDelete());
    },
    [dispatch],
  );

  if (pendingOperation && (!open || pendingOperation.target !== target)) {
    setPendingOperation(undefined);
  }

  const confirm = () => {
    if (!target) return;
    // Set pending urgently for this operation, rather than for every overlapping transition.
    // The wrapper is unique even when the same target is closed and confirmed again.
    const operation = { target };
    setPendingOperation(operation);
    startTransition(async () => {
      await deletion.confirm(target.id);
      setPendingOperation((current) => (current === operation ? undefined : current));
    });
  };
  return {
    target,
    open,
    close,
    confirm,
    pending:
      deletion.pending || (pendingOperation !== undefined && pendingOperation.target === target),
    error: deletion.error,
  };
}
