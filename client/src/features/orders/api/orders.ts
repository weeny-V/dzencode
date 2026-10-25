import { deleteRequest, postJson } from '@/shared/api/http';
import { getJson } from '@/shared/api/server';
import type { NewOrder, OrderDetails, OrderSummary } from '@/shared/api/types';
import { toQuery } from '@/shared/lib/searchParams';

export const ordersTag = 'orders';
export const orderTag = (id: number) => `order:${id}`;

/** `GET /orders`, newest first. A search keeps the orders whose title or products contain the text. */
export const getOrders = (query: string, signal?: AbortSignal): Promise<OrderSummary[]> =>
  getJson<OrderSummary[]>(`/orders${toQuery({ q: query })}`, { tags: [ordersTag], signal });

/** `GET /orders/:id`: the order with all its products. */
export const getOrder = (id: number, signal?: AbortSignal): Promise<OrderDetails> =>
  getJson<OrderDetails>(`/orders/${id}`, { tags: [orderTag(id)], signal });

/** `POST /orders`: the created order comes back in the shape of a list item (no products yet). */
export const postOrder = (order: NewOrder, signal?: AbortSignal): Promise<OrderSummary> =>
  postJson<OrderSummary>('/orders', order, signal);

/** `DELETE /orders/:id`: removes the order together with its products. */
export const removeOrder = (id: number, signal?: AbortSignal): Promise<void> =>
  deleteRequest(`/orders/${id}`, signal);
