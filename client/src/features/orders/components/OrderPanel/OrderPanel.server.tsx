import './OrderPanel.scss';

import Link from 'next/link';
import type { CSSProperties } from 'react';

import { DeleteButton } from '@/features/confirmation';
import { loadOrError } from '@/shared/api/server';
import type { OrderDetails } from '@/shared/api/types';
import type { ActionResult } from '@/shared/lib/actionResult';
import { toQuery } from '@/shared/lib/searchParams';
import { CloseIcon, PlusIcon } from '@/shared/ui/icons';
import { LoadError } from '@/shared/ui/LoadError';
import { ProductThumb } from '@/shared/ui/ProductThumb';

import { getOrder } from '../../api/orders';

export async function OrderPanel({
  id,
  closeHref,
  details,
}: {
  id: number;
  closeHref: string;
  details?: Promise<ActionResult<OrderDetails>>;
}) {
  const result = await (details ?? loadOrError(() => getOrder(id)));
  return <OrderPanelView result={result} closeHref={closeHref} />;
}

/** The server-rendered view receives the completed read and does not load data itself. */
function OrderPanelView({
  result,
  closeHref,
}: {
  result: ActionResult<OrderDetails>;
  closeHref: string;
}) {
  return (
    <section className="order-panel" aria-labelledby="order-panel-title">
      <Link href={closeHref} className="order-panel__close" aria-label="Закрыть панель">
        <CloseIcon />
      </Link>
      <header className="order-panel__header">
        <h2 className="order-panel__title" id="order-panel-title">
          {result.ok ? result.data.title : 'Приход'}
        </h2>
        {result.ok && (
          <Link
            href={`/products/new${toQuery({ order: String(result.data.id) })}`}
            className="order-panel__add"
          >
            <PlusIcon />
            Добавить продукт
          </Link>
        )}
      </header>
      {!result.ok ? (
        <div className="order-panel__state">
          <LoadError title="Не удалось загрузить приход." message={result.error} />
        </div>
      ) : result.data.products.length === 0 ? (
        <p className="order-panel__empty">В этом приходе пока нет продуктов.</p>
      ) : (
        <ul className="order-panel__list">
          {result.data.products.map((product, index) => (
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
              <div className="order-panel__product-delete">
                <DeleteButton
                  label={`Удалить продукт ${product.title}`}
                  target={{
                    kind: 'product',
                    id: product.id,
                    title: product.title,
                    orderId: product.order,
                    meta: `SN-${product.serialNumber} · ${product.orderTitle}`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
