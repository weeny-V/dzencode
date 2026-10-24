'use client';

import { OrdersPage } from '../OrdersPage';
import { useOrders } from './useOrders';

interface OrdersContainerProps {
  /** The order of the open panel (`?order=`), already read from the address. */
  selectedId?: number;
  /** The search text (`?q=`). */
  query: string;
}

/** Takes the orders from the store (the hook keeps them in step with the address) and hands them to the page. */
export function OrdersContainer({ selectedId, query }: OrdersContainerProps) {
  const { orders, refreshing, error, retryList, panel, retryPanel } = useOrders(selectedId, query);

  return (
    <OrdersPage
      orders={orders}
      refreshing={refreshing}
      error={error}
      onRetryList={retryList}
      selectedId={selectedId}
      panel={panel}
      onRetryPanel={retryPanel}
      query={query}
    />
  );
}
