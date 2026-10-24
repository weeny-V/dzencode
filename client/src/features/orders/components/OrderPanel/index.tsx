import './OrderPanel.scss';

import Link from 'next/link';
import type { CSSProperties } from 'react';

import type { OrderDetails } from '@/shared/api/types';
import { CloseIcon, PlusIcon, TrashIcon } from '@/shared/ui/icons';
import { LoadError } from '@/shared/ui/LoadError';
import { ProductThumb } from '@/shared/ui/ProductThumb';
import { ListSkeleton } from '@/shared/ui/Skeleton';

/** What the panel shows: the request is running, it failed, or the order is here. */
export type PanelView =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; order: OrderDetails };

interface OrderPanelProps {
  panel: PanelView;
  /** Where the cross leads: the orders page without the panel (and with the search kept). */
  closeHref: string;
  onRetry: () => void;
}

/** The products of the open order. */
function OrderProducts({ order }: { order: OrderDetails }) {
  if (order.products.length === 0) {
    return <p className="order-panel__empty">В этом приходе пока нет продуктов.</p>;
  }

  return (
    <ul className="order-panel__list">
      {order.products.map((product, index) => (
        <li
          key={product.id}
          className="order-panel__product"
          style={{ '--i': index } as CSSProperties}
        >
          <span
            className={`order-panel__dot${product.isNew ? '' : ' order-panel__dot--used'}`}
            role="img"
            aria-label={product.isNew ? 'Новый' : 'Б / У'}
            title={product.isNew ? 'Новый' : 'Б / У'}
          />
          <ProductThumb />
          <div className="order-panel__product-main">
            <span className="order-panel__product-title" title={product.title}>
              {product.title}
            </span>
            <span className="order-panel__product-serial">SN-{product.serialNumber}</span>
          </div>
          <span className="order-panel__product-type">{product.type}</span>
          <button
            type="button"
            className="order-panel__product-delete"
            disabled
            aria-label={`Удалить продукт ${product.title}`}
            title="Удаление продуктов: скоро"
          >
            <TrashIcon />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** The panel next to the list with the products of the chosen order. The cross closes it. */
export function OrderPanel({ panel, closeHref, onRetry }: OrderPanelProps) {
  return (
    <section className="order-panel" aria-labelledby="order-panel-title">
      <Link href={closeHref} className="order-panel__close" aria-label="Закрыть панель">
        <CloseIcon />
      </Link>

      <header className="order-panel__header">
        <h2 className="order-panel__title" id="order-panel-title">
          {panel.status === 'ready' ? panel.order.title : 'Приход'}
        </h2>
        {/* Adding a product is built in stage 5; the link is drawn as in the design. */}
        <button
          type="button"
          className="order-panel__add"
          disabled
          title="Добавление продукта: скоро"
        >
          <PlusIcon />
          Добавить продукт
        </button>
      </header>

      {panel.status === 'ready' && <OrderProducts order={panel.order} />}
      {panel.status === 'loading' && (
        <div className="order-panel__state">
          <ListSkeleton rows={3} rowHeight="4rem" label="Загрузка продуктов…" />
        </div>
      )}
      {panel.status === 'error' && (
        <div className="order-panel__state">
          <LoadError
            title="Не удалось загрузить приход."
            message={panel.message}
            onRetry={onRetry}
          />
        </div>
      )}
    </section>
  );
}
