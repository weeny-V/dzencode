'use client';

import type { OrderSummary } from '@/shared/api/types';
import { pluralize } from '@/shared/lib/plural';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { ListIcon } from '@/shared/ui/icons';
import { ItemSummary } from '@/shared/ui/ItemSummary';

import { useDeleteOrder } from './useDeleteOrder';

interface DeleteOrderDialogProps {
  /** The order the window is about. It stays after the window closes, for the closing animation. */
  order: OrderSummary | undefined;
  open: boolean;
  onClose: () => void;
  /** Called after the order is deleted and the window is closed. */
  onDeleted: (id: number) => void;
}

/** The confirmation window of deleting an order, as in the design. Mount it once for the whole list. */
export function DeleteOrderDialog({ order, open, onClose, onDeleted }: DeleteOrderDialogProps) {
  const { pending, error, confirm, close } = useDeleteOrder(onClose, onDeleted);

  return (
    <ConfirmDialog
      open={open}
      title="Вы уверены, что хотите удалить этот приход?"
      onClose={close}
      onConfirm={() => order && void confirm(order.id)}
      pending={pending}
      error={error}
    >
      {order && (
        <ItemSummary
          icon={<ListIcon />}
          title={order.title}
          meta={`${order.productsCount} ${pluralize(order.productsCount, ['продукт', 'продукта', 'продуктов'])}`}
        />
      )}
    </ConfirmDialog>
  );
}
