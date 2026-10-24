import { parseSearch, type SearchParams } from '@/shared/lib/searchParams';

import { getOrder, listOrders } from '../../data';
import { parseOrderId } from '../../searchParams';
import { OrdersPage } from '../OrdersPage';

/** The content of the `/orders` route: loads the data for the address and hands it to the page. */
export async function OrdersRoute({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const orderId = parseOrderId(params.order);
  const query = parseSearch(params.q);

  return (
    <OrdersPage
      orders={listOrders(query)}
      selected={orderId === undefined ? undefined : getOrder(orderId)}
      query={query}
    />
  );
}
