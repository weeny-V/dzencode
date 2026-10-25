'use client';

import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { ListIcon } from '@/shared/ui/icons';
import { ItemSummary } from '@/shared/ui/ItemSummary';
import { ProductThumb } from '@/shared/ui/ProductThumb';

import { type DeleteActions, useDeleteDialog } from './useDeleteDialog';

/** Mount once outside Suspense and the rows, so refreshes preserve the closing animation. */
export function DeleteDialogHost(actions: DeleteActions) {
  const { target, open, close, confirm, pending, error } = useDeleteDialog(actions);
  return (
    <ConfirmDialog
      open={open}
      title={`Вы уверены, что хотите удалить этот ${target?.kind === 'product' ? 'продукт' : 'приход'}?`}
      onClose={close}
      onConfirm={confirm}
      pending={pending}
      error={error}
    >
      {target && (
        <ItemSummary
          icon={target.kind === 'order' ? <ListIcon /> : <ProductThumb />}
          title={target.title}
          meta={target.meta}
        />
      )}
    </ConfirmDialog>
  );
}
