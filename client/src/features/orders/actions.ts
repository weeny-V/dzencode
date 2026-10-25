'use server';

import { refresh, updateTag } from 'next/cache';

import { loadOrError } from '@/shared/api/server';
import type { NewOrder } from '@/shared/api/types';
import { MAX_INT } from '@/shared/lib/limits';

import { ordersTag, orderTag, postOrder, removeOrder } from './api/orders';

export async function createOrder(order: NewOrder) {
  const result = await loadOrError(() => postOrder(order));
  if (result.ok) {
    updateTag(ordersTag);
    updateTag(orderTag(result.data.id));
    updateTag('products');
  }
  return result;
}

export async function deleteOrder(id: number) {
  if (!Number.isInteger(id) || id < 1 || id > MAX_INT)
    return { ok: false as const, error: 'Invalid order id' };
  const result = await loadOrError(() => removeOrder(id));
  if (result.ok) {
    updateTag(ordersTag);
    updateTag(orderTag(id));
    updateTag('products');
    refresh();
  }
  return result;
}
