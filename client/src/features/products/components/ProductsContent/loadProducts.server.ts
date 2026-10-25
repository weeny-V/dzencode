import { loadOrError } from '@/shared/api/server';

import { getProducts, getProductTypes } from '../../api/products';
import { parseType } from '../../searchParams';

/**
 * What the products page shows for an address: the type names, the products of the (validated) type and search,
 * and the type that is really selected. The header and the list both call it; the reads are shared per request.
 */
export async function loadProductsView(typeParam: string, query: string) {
  const [types, initialProducts] = await Promise.all([
    loadOrError(getProductTypes),
    loadOrError(() => getProducts({ type: typeParam, query })),
  ]);
  const selectedType = types.ok ? parseType(typeParam, types.data) : '';
  // Unknown types mean all products. Known names can reuse the case-insensitive API result.
  const products =
    types.ok && typeParam && !selectedType
      ? await loadOrError(() => getProducts({ type: '', query }))
      : initialProducts;
  return { types, products, selectedType };
}
