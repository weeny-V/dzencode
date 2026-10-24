import { parseSearch, type SearchParams } from '@/shared/lib/searchParams';

import { parseTypeParam } from '../../searchParams';
import { ProductsContainer } from '../ProductsContainer';

/**
 * The content of the `/products` route. It reads the address on the server and hands the result to the
 * container, which loads the data in the browser (prefetching it on the server is stage 6).
 */
export async function ProductsRoute({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  return (
    <ProductsContainer typeParam={parseTypeParam(params.type)} query={parseSearch(params.q)} />
  );
}
