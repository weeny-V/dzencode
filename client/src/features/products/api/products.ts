import { deleteRequest, postJson, request } from '@/shared/api/http';
import type { NewProduct, OrderSummary, Product, ProductType } from '@/shared/api/types';
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

/** `POST /products`: the created product comes back in the shape of a list item. */
export const postProduct = (product: NewProduct, signal?: AbortSignal): Promise<Product> =>
  postJson<Product>('/products', product, signal);

/** `DELETE /products/:id`: removes the product together with its prices. */
export const removeProduct = (id: number, signal?: AbortSignal): Promise<void> =>
  deleteRequest(`/products/${id}`, signal);

/** An order as the "Приход" select of the product form offers it. */
export interface OrderOption {
  id: number;
  title: string;
}

/** `GET /orders`, reduced to what the select needs (the newest orders come first). */
export const getOrderOptions = async (signal?: AbortSignal): Promise<OrderOption[]> => {
  const orders = await request<OrderSummary[]>('/orders', { signal });
  return orders.map(({ id, title }) => ({ id, title }));
};
