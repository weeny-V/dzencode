'use client';

import type { Product } from '@/shared/api/types';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { ItemSummary } from '@/shared/ui/ItemSummary';
import { ProductThumb } from '@/shared/ui/ProductThumb';

import { useDeleteProduct } from './useDeleteProduct';

interface DeleteProductDialogProps {
  /** The product the window is about. It stays after the window closes, for the closing animation. */
  product: Product | undefined;
  open: boolean;
  onClose: () => void;
  /** Called after the product is deleted and the window is closed. */
  onDeleted: () => void;
}

/** The confirmation window of deleting a product. Mount it once for the whole list. */
export function DeleteProductDialog({
  product,
  open,
  onClose,
  onDeleted,
}: DeleteProductDialogProps) {
  const { pending, error, confirm, close } = useDeleteProduct(onClose, onDeleted);

  return (
    <ConfirmDialog
      open={open}
      title="Вы уверены, что хотите удалить этот продукт?"
      onClose={close}
      onConfirm={() => product && void confirm(product.id)}
      pending={pending}
      error={error}
    >
      {product && (
        <ItemSummary
          icon={<ProductThumb />}
          title={product.title}
          meta={`SN-${product.serialNumber} · ${product.orderTitle}`}
        />
      )}
    </ConfirmDialog>
  );
}
