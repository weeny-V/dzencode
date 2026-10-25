'use client';

import { useTranslations } from 'next-intl';

import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { ListIcon } from '@/shared/ui/icons';
import { ItemSummary } from '@/shared/ui/ItemSummary';
import { ProductThumb } from '@/shared/ui/ProductThumb';

import { type DeleteActions, useDeleteDialog } from './useDeleteDialog';

/** Mount once outside Suspense and the rows, so refreshes preserve the closing animation. */
export function DeleteDialogHost(actions: DeleteActions) {
  const t = useTranslations('DeleteDialogHost');
  const { target, open, close, confirm, pending, error } = useDeleteDialog(actions);
  return (
    <ConfirmDialog
      open={open}
      title={t(target?.kind === 'product' ? 'product' : 'order')}
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
