import { parseSearch, type SearchParams } from '@/shared/lib/searchParams';

import { listProducts, listProductTypes } from '../../data';
import { parseType } from '../../searchParams';
import { ProductsPage } from '../ProductsPage';

/** The content of the `/products` route: loads the data for the address and hands it to the page. */
export async function ProductsRoute({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const types = listProductTypes();
  const selectedType = parseType(params.type, types);
  const query = parseSearch(params.q);

  return (
    <ProductsPage
      products={listProducts(selectedType || undefined, query)}
      types={types}
      selectedType={selectedType}
      query={query}
    />
  );
}
