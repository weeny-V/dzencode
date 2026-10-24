'use client';

import './DeleteOrderButton.scss';

import { useState } from 'react';

import type { OrderSummary } from '@/shared/api/types';
import { pluralize } from '@/shared/lib/plural';
import { Button } from '@/shared/ui/Button';
import { ListIcon, TrashIcon } from '@/shared/ui/icons';
import { Modal } from '@/shared/ui/Modal';

/** The trash icon of an order row and the confirmation window it opens. */
export function DeleteOrderButton({ order }: { order: OrderSummary }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        className="delete-order__trigger"
        onClick={() => setOpen(true)}
        aria-label={`Удалить приход ${order.title}`}
      >
        <TrashIcon />
      </button>

      {/* Always mounted: the Modal plays its own opening and closing animation when `open` changes. */}
      <Modal
        open={open}
        title="Вы уверены, что хотите удалить этот приход?"
        onClose={close}
        actions={
          <>
            <Button variant="text" onClick={close}>
              Отменить
            </Button>
            {/* Deleting is wired up in stage 5; the button is drawn as in the design. */}
            <Button variant="light-danger" disabled title="Удаление: скоро">
              <TrashIcon />
              Удалить
            </Button>
          </>
        }
      >
        <div className="delete-order__summary">
          <span className="delete-order__icon">
            <ListIcon />
          </span>
          <div className="delete-order__text">
            <span className="delete-order__title">{order.title}</span>
            <span className="delete-order__meta">
              {order.productsCount}{' '}
              {pluralize(order.productsCount, ['продукт', 'продукта', 'продуктов'])}
            </span>
          </div>
        </div>
      </Modal>
    </>
  );
}
