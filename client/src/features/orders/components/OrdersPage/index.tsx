import './OrdersPage.scss';

import { ViewTransition } from 'react';

import { DeleteProductDialog } from '@/features/products';
import type { OrderSummary, Product } from '@/shared/api/types';
import type { DialogTarget } from '@/shared/hooks/useDialogTarget';
import { toQuery } from '@/shared/lib/searchParams';
import { LoadError } from '@/shared/ui/LoadError';
import { NoResults } from '@/shared/ui/NoResults';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ListSkeleton } from '@/shared/ui/Skeleton';

import { DeleteOrderDialog } from '../DeleteOrderDialog';
import { OrderItem } from '../OrderItem';
import { OrderPanel, type PanelView } from '../OrderPanel';
import { PanelScroll } from '../PanelScroll';

/** The two confirmation windows of the page and what to do when something was deleted. */
export interface OrdersDeletion {
  order: DialogTarget<OrderSummary>;
  product: DialogTarget<Product>;
  onOrderDeleted: (id: number) => void;
  onProductDeleted: () => void;
}

interface OrdersPageProps {
  /** The rows to show; `undefined` until the first load has finished. */
  orders?: readonly OrderSummary[];
  /** A newer list is being loaded: the rows on screen are the previous ones and look dimmed. */
  refreshing: boolean;
  /** Why the list could not be loaded, if it could not. */
  error?: string;
  onRetryList: () => void;
  /** The order whose panel is open, if any (`/orders?order=2`). */
  selectedId?: number;
  /** What the open panel shows; present exactly when `selectedId` is. */
  panel?: PanelView;
  onRetryPanel: () => void;
  deletion: OrdersDeletion;
  /** The search text (`/orders?q=...`); it is kept in every link of the page. */
  query: string;
}

/** The list area: placeholder rows, the error, the empty message or the rows. */
function OrdersList({
  orders,
  refreshing,
  error,
  onRetryList,
  selectedId,
  query,
  onDelete,
}: Pick<
  OrdersPageProps,
  'orders' | 'refreshing' | 'error' | 'onRetryList' | 'selectedId' | 'query'
> & { onDelete: (order: OrderSummary) => void }) {
  if (error !== undefined) {
    return (
      <LoadError title="Не удалось загрузить приходы." message={error} onRetry={onRetryList} />
    );
  }
  if (orders === undefined) {
    return <ListSkeleton rows={6} rowHeight="4.5rem" label="Загрузка приходов…" />;
  }
  if (orders.length === 0) {
    return query ? (
      <NoResults
        query={query}
        clearHref={`/orders${toQuery({ order: selectedId === undefined ? undefined : String(selectedId) })}`}
      />
    ) : (
      <p className="orders-page__empty">Приходов пока нет.</p>
    );
  }

  return (
    <ul
      className={`orders-page__list${refreshing ? ' orders-page__list--refreshing' : ''}`}
      aria-busy={refreshing}
    >
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
            selected={order.id === selectedId}
            compact={selectedId !== undefined}
            onDelete={onDelete}
          />
        </ViewTransition>
      ))}
    </ul>
  );
}

/** The orders page: the list and, next to it, the products of the chosen order. */
export function OrdersPage({
  orders,
  refreshing,
  error,
  onRetryList,
  selectedId,
  panel,
  onRetryPanel,
  deletion,
  query,
}: OrdersPageProps) {
  return (
    <>
      <PageHeader
        title="Приходы"
        count={orders?.length}
        add={{ label: 'Добавить приход', href: '/orders/new' }}
      />

      <div className={`orders-page${selectedId === undefined ? '' : ' orders-page--with-panel'}`}>
        <OrdersList
          orders={orders}
          refreshing={refreshing}
          error={error}
          onRetryList={onRetryList}
          selectedId={selectedId}
          query={query}
          onDelete={deletion.order.ask}
        />

        {/* The panel slides in and out; switching between orders swaps it (the key changes). */}
        {selectedId !== undefined && panel && (
          <ViewTransition key={selectedId} enter="panel-enter" exit="panel-exit" default="none">
            <PanelScroll className="orders-page__panel" orderId={selectedId}>
              <OrderPanel
                panel={panel}
                closeHref={`/orders${toQuery({ q: query })}`}
                onRetry={onRetryPanel}
                onDeleteProduct={deletion.product.ask}
              />
            </PanelScroll>
          </ViewTransition>
        )}
      </div>

      {/* Mounted once, outside the rows: a row disappears when its deletion succeeds, the window must not. */}
      <DeleteOrderDialog
        order={deletion.order.target}
        open={deletion.order.open}
        onClose={deletion.order.close}
        onDeleted={deletion.onOrderDeleted}
      />
      <DeleteProductDialog
        product={deletion.product.target}
        open={deletion.product.open}
        onClose={deletion.product.close}
        onDeleted={deletion.onProductDeleted}
      />
    </>
  );
}
