import { request } from '@/shared/api/http';
import type { Product, ProductType } from '@/shared/api/types';
import { toQuery } from '@/shared/lib/searchParams';

export interface ProductsFilter {
  /** Product type name; empty means all types. */
  type: string;
  /** Search text; empty means no search. */
  query: string;
}

/** `GET /products`, optionally of one type and matching a search text. */
export const getProducts = (
  { type, query }: ProductsFilter,
  signal?: AbortSignal,
): Promise<Product[]> => request<Product[]>(`/products${toQuery({ type, q: query })}`, { signal });

/** `GET /product-types`: the names for the type filter. */
export const getProductTypes = async (signal?: AbortSignal): Promise<string[]> => {
  const types = await request<ProductType[]>('/product-types', { signal });
  return types.map((type) => type.name);
};
