'use server';

import { refresh, updateTag } from 'next/cache';

import { getWarehouses } from '@/features/warehouses';
import { ApiError } from '@/shared/api/errors';
import { mutateOrError } from '@/shared/api/mutation.server';
import { loadOrError } from '@/shared/api/server';
import type { NewOrder } from '@/shared/api/types';
import type { ActionResult } from '@/shared/lib/actionResult';
import { MAX_INT } from '@/shared/lib/limits';
import { parseSearch } from '@/shared/lib/searchParams';

import { getOrders, ordersTag, orderTag, postOrder, removeOrder } from './api/orders';
import type { OrdersExportData } from './exportCsv';

export async function createOrder(order: NewOrder, expectedSessionId?: string) {
  const result = await mutateOrError(() => postOrder(order), expectedSessionId);
  if (result.ok) {
    updateTag(ordersTag);
    updateTag(orderTag(result.data.id));
    updateTag('products');
    updateTag('statistics');
  }
  return result;
}

export async function deleteOrder(id: number, expectedSessionId?: string) {
  const result = await mutateOrError(async () => {
    if (!Number.isInteger(id) || id < 1 || id > MAX_INT)
      throw new ApiError(400, 'Invalid order id');
    return await removeOrder(id);
  }, expectedSessionId);
  if (result.ok) {
    updateTag(ordersTag);
    updateTag(orderTag(id));
    updateTag('products');
    updateTag('statistics');
    refresh();
  }
  return result;
}

/** What the CSV export of the orders page is made of: the orders of the current search (all of them, not a page). */
export async function loadOrdersExport(query: unknown): Promise<ActionResult<OrdersExportData>> {
  const search = parseSearch(typeof query === 'string' ? query : undefined);
  return loadOrError(async () => {
    const [orders, warehouses] = await Promise.all([getOrders(search), getWarehouses()]);
    return { orders, warehouses: warehouses.map(({ id, name }) => ({ id, name })) };
  });
}
