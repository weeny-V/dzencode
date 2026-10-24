import './ProductRow.scss';

import Link from 'next/link';
import type { CSSProperties } from 'react';

import type { Product } from '@/shared/api/types';
import { formatNumericDate } from '@/shared/lib/date';
import { DateStack } from '@/shared/ui/DateStack';
import { TrashIcon } from '@/shared/ui/icons';
import { PriceStack } from '@/shared/ui/PriceStack';
import { ProductThumb } from '@/shared/ui/ProductThumb';

interface ProductRowProps {
  product: Product;
  /** Position in the list: rows appear one after another (see `stagger` in _transitions.scss). */
  index: number;
}

/** One product in the products table. */
export function ProductRow({ product, index }: ProductRowProps) {
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
        {product.isNew ? 'Новый' : 'Б / У'}
      </span>

      <div className="product-row__guarantee">
        <span>с {formatNumericDate(product.guarantee.start)}</span>
        <span>по {formatNumericDate(product.guarantee.end)}</span>
      </div>

      <PriceStack prices={product.price} />

      <Link href={`/orders?order=${product.order}`} className="product-row__order">
        {product.orderTitle}
      </Link>

      <DateStack iso={product.date} />

      {/* Deleting products is not part of this stage; the icon is drawn as in the design. */}
      <button
        type="button"
        className="product-row__delete"
        disabled
        aria-label={`Удалить продукт ${product.title}`}
        title="Удаление продуктов: скоро"
      >
        <TrashIcon />
      </button>
    </li>
  );
}
