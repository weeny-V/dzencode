import './OrderItem.scss';

import Link from 'next/link';
import type { CSSProperties } from 'react';

import { DeleteButton } from '@/features/confirmation';
import type { OrderSummary } from '@/shared/api/types';
import { pluralize } from '@/shared/lib/plural';
import { DateStack } from '@/shared/ui/DateStack';
import { ChevronRightIcon, ListIcon } from '@/shared/ui/icons';
import { PriceStack } from '@/shared/ui/PriceStack';

interface OrderItemProps {
  order: OrderSummary;
  /** Position in the list: rows appear one after another (see `stagger` in _transitions.scss). */
  index: number;
  /** Where the row leads: the same page with this order's panel open (and the search kept). */
  href: string;
  /** The order whose panel is open. */
  selected: boolean;
  /** The list is narrow while a panel is open: title, prices and the delete button are hidden. */
  compact: boolean;
}

/** One order in the list. The whole row opens the order's panel (the link is stretched over it). */
export function OrderItem({ order, index, href, selected, compact }: OrderItemProps) {
  const className = [
    'order-item',
    compact && 'order-item--compact',
    selected && 'order-item--selected',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={className} style={{ '--i': index } as CSSProperties}>
      <h2 className="order-item__title">
        <Link href={href} className="order-item__link" aria-current={selected ? 'true' : undefined}>
          <span className="order-item__label">{order.title}</span>
        </Link>
      </h2>

      <span className="order-item__icon" aria-hidden="true">
        <ListIcon />
      </span>

      <div className="order-item__count">
        <span className="order-item__count-number">{order.productsCount}</span>
        <span className="order-item__count-label">
          {pluralize(order.productsCount, ['продукт', 'продукта', 'продуктов'])}
        </span>
      </div>

      <div className="order-item__date">
        <DateStack iso={order.date} />
      </div>

      <div className="order-item__total">
        <PriceStack prices={order.totals} />
      </div>

      <div className="order-item__delete">
        <DeleteButton
          label={`Удалить приход ${order.title}`}
          target={{
            kind: 'order',
            id: order.id,
            title: order.title,
            meta: `${order.productsCount} ${pluralize(order.productsCount, ['продукт', 'продукта', 'продуктов'])}`,
          }}
        />
      </div>

      {selected && (
        <span className="order-item__arrow" aria-hidden="true">
          <ChevronRightIcon />
        </span>
      )}
    </li>
  );
}
