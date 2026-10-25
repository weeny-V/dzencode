import './ProductRow.scss';

import Link from 'next/link';
import type { CSSProperties } from 'react';

import { DeleteButton } from '@/features/confirmation';
import type { Product } from '@/shared/api/types';
import { formatNumericDate } from '@/shared/lib/date';
import { DateStack } from '@/shared/ui/DateStack';
import { PriceStack } from '@/shared/ui/PriceStack';
import { ProductThumb } from '@/shared/ui/ProductThumb';

import { text } from './messages.server';

interface ProductRowProps {
  product: Product;
  /** Position in the list: rows appear one after another (see `stagger` in _transitions.scss). */
  index: number;
}

/** One product in the products table. */
export async function ProductRow({ product, index }: ProductRowProps) {
  const t = await text();
  return (
    <li className="product-row" style={{ '--i': index } as CSSProperties}>
      <ProductThumb />

      <div className="product-row__main">
        <span className="product-row__title" title={product.title}>
          {product.title}
        </span>
        <span className="product-row__serial">SN-{product.serialNumber}</span>
      </div>

      <span className="product-row__type">{product.type}</span>

      <span className={`product-row__state${product.isNew ? '' : ' product-row__state--used'}`}>
        {product.isNew ? t('new') : t('used')}
      </span>

      <div className="product-row__guarantee">
        <span>
          {t('from')} {formatNumericDate(product.guarantee.start)}
        </span>
        <span>
          {t('to')} {formatNumericDate(product.guarantee.end)}
        </span>
      </div>

      <PriceStack prices={product.price} />

      <Link href={`/orders?order=${product.order}`} className="product-row__order">
        {product.orderTitle}
      </Link>

      <DateStack iso={product.date} />

      <DeleteButton
        label={t('delete', { title: product.title })}
        target={{
          kind: 'product',
          id: product.id,
          orderId: product.order,
          title: product.title,
          meta: `SN-${product.serialNumber} · ${product.orderTitle}`,
        }}
      />
    </li>
  );
}
