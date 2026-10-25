import './OrderPanel.scss';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import { DeleteButton } from '@/features/confirmation';
import { WarehouseLocation } from '@/features/warehouses';
import { loadOrError } from '@/shared/api/server';
import type { OrderDetails } from '@/shared/api/types';
import type { Text } from '@/shared/i18n/server';
import type { ActionResult } from '@/shared/lib/actionResult';
import { toQuery } from '@/shared/lib/searchParams';
import { CloseIcon, PlusIcon } from '@/shared/ui/icons';
import { LoadError } from '@/shared/ui/LoadError';
import { ProductThumb } from '@/shared/ui/ProductThumb';

import { getOrder } from '../../api/orders';
import { text } from './messages.server';

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
  const t = await text();
  const warehouseLocation = result.ok
    ? await WarehouseLocation({ warehouse: result.data.warehouse, orderId: result.data.id })
    : null;
  return (
    <OrderPanelView
      t={t}
      result={result}
      closeHref={closeHref}
      warehouseLocation={warehouseLocation}
    />
  );
}

/** The server-rendered view receives the completed read and does not load data itself. */
function OrderPanelView({
  t,
  result,
  closeHref,
  warehouseLocation,
}: {
  t: Text;
  result: ActionResult<OrderDetails>;
  closeHref: string;
  warehouseLocation: ReactNode;
}) {
  return (
    <section className="order-panel" aria-labelledby="order-panel-title">
      <Link href={closeHref} className="order-panel__close" aria-label={t('close')}>
        <CloseIcon />
      </Link>
      <header className="order-panel__header">
        <h2 className="order-panel__title" id="order-panel-title">
          {result.ok ? result.data.title : t('title')}
        </h2>
        {result.ok && (
          <Link
            href={`/products/new${toQuery({ order: String(result.data.id) })}`}
            className="order-panel__add"
          >
            <PlusIcon />
            {t('add')}
          </Link>
        )}
      </header>
      {warehouseLocation}
      {!result.ok ? (
        <div className="order-panel__state">
          <LoadError title={t('failed')} />
        </div>
      ) : result.data.products.length === 0 ? (
        <p className="order-panel__empty">{t('empty')}</p>
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
                aria-label={product.isNew ? t('new') : t('used')}
                title={product.isNew ? t('new') : t('used')}
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
                  label={t('delete', { title: product.title })}
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
