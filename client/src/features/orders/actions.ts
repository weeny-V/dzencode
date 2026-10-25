'use server';

import { refresh, updateTag } from 'next/cache';

import { ApiError } from '@/shared/api/errors';
import { mutateOrError } from '@/shared/api/mutation.server';
import type { NewOrder } from '@/shared/api/types';
import { MAX_INT } from '@/shared/lib/limits';

import { ordersTag, orderTag, postOrder, removeOrder } from './api/orders';

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
