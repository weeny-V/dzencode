import { request } from '@/shared/api/http';
import type { OrderDetails, OrderSummary } from '@/shared/api/types';
import { toQuery } from '@/shared/lib/searchParams';

/** `GET /orders`, newest first. A search keeps the orders whose title or products contain the text. */
export const getOrders = (query: string, signal?: AbortSignal): Promise<OrderSummary[]> =>
  request<OrderSummary[]>(`/orders${toQuery({ q: query })}`, { signal });

/** `GET /orders/:id`: the order with all its products. */
export const getOrder = (id: number, signal?: AbortSignal): Promise<OrderDetails> =>
  request<OrderDetails>(`/orders/${id}`, { signal });
