import './OrderPanel.scss';

import Link from 'next/link';
import type { CSSProperties } from 'react';

import type { OrderDetails } from '@/shared/api/types';
import { CloseIcon, PlusIcon, TrashIcon } from '@/shared/ui/icons';
import { ProductThumb } from '@/shared/ui/ProductThumb';

interface OrderPanelProps {
  order: OrderDetails;
  /** Where the cross leads: the orders page without the panel (and with the search kept). */
  closeHref: string;
}

/** The panel next to the list with the products of the chosen order. The cross closes it. */
export function OrderPanel({ order, closeHref }: OrderPanelProps) {
  return (
    <section className="order-panel" aria-labelledby="order-panel-title">
      <Link href={closeHref} className="order-panel__close" aria-label="Закрыть панель">
        <CloseIcon />
      </Link>

      <header className="order-panel__header">
        <h2 className="order-panel__title" id="order-panel-title">
          {order.title}
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

      {order.products.length === 0 ? (
        <p className="order-panel__empty">В этом приходе пока нет продуктов.</p>
      ) : (
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
      )}
    </section>
  );
}
