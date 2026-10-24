import './OrdersPage.scss';

import { ViewTransition } from 'react';

import type { OrderDetails, OrderSummary } from '@/shared/api/types';
import { toQuery } from '@/shared/lib/searchParams';
import { NoResults } from '@/shared/ui/NoResults';
import { PageHeader } from '@/shared/ui/PageHeader';

import { OrderItem } from '../OrderItem';
import { OrderPanel } from '../OrderPanel';
import { PanelScroll } from '../PanelScroll';

interface OrdersPageProps {
  orders: readonly OrderSummary[];
  /** The order whose panel is open, if any (`/orders?order=2`). */
  selected?: OrderDetails;
  /** The search text (`/orders?q=...`); it is kept in every link of the page. */
  query: string;
}

/** The orders page: the list and, next to it, the products of the chosen order. */
export function OrdersPage({ orders, selected, query }: OrdersPageProps) {
  return (
    <>
      <PageHeader title="Приходы" count={orders.length} addLabel="Добавить приход" />

      <div className={`orders-page${selected ? ' orders-page--with-panel' : ''}`}>
        {orders.length === 0 ? (
          <NoResults
            query={query}
            clearHref={`/orders${toQuery({ order: selected && String(selected.id) })}`}
          />
        ) : (
          <ul className="orders-page__list">
            {orders.map((order, index) => (
              // The name lets the browser move and resize the row smoothly when the panel opens or the search
              // removes its neighbours; rows that appear get the CSS entrance of `.order-item` instead.
              <ViewTransition
                key={order.id}
                name={`order-${order.id}`}
                enter="none"
                exit="auto"
                share="row-move"
                update="row-move"
              >
                <OrderItem
                  order={order}
                  index={index}
                  href={`/orders${toQuery({ order: String(order.id), q: query })}`}
                  selected={order.id === selected?.id}
                  compact={Boolean(selected)}
                />
              </ViewTransition>
            ))}
          </ul>
        )}

        {/* The panel slides in and out; switching between orders swaps it (the key changes). */}
        {selected && (
          <ViewTransition key={selected.id} enter="panel-enter" exit="panel-exit" default="none">
            <PanelScroll className="orders-page__panel" orderId={selected.id}>
              <OrderPanel order={selected} closeHref={`/orders${toQuery({ q: query })}`} />
            </PanelScroll>
          </ViewTransition>
        )}
      </div>
    </>
  );
}
