import { parseSearch, type SearchParams } from '@/shared/lib/searchParams';

import { parseOrderId } from '../../searchParams';
import { OrdersContainer } from '../OrdersContainer';

/**
 * The content of the `/orders` route. It reads the address on the server and hands the result to the container,
 * which loads the data in the browser (prefetching it on the server is stage 6).
 */
export async function OrdersRoute({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  return <OrdersContainer selectedId={parseOrderId(params.order)} query={parseSearch(params.q)} />;
}
