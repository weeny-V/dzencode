'use server';

import { refresh, updateTag } from 'next/cache';

import { ApiError } from '@/shared/api/errors';
import { mutateOrError } from '@/shared/api/mutation.server';
import type { NewProduct } from '@/shared/api/types';
import { MAX_INT } from '@/shared/lib/limits';

import { postProduct, productsTag, removeProduct } from './api/products';

export async function createProduct(product: NewProduct, expectedSessionId?: string) {
  const result = await mutateOrError(() => postProduct(product), expectedSessionId);
  if (result.ok) {
    updateTag(productsTag);
    updateTag('orders');
    updateTag(`order:${result.data.order}`);
  }
  return result;
}

export async function deleteProduct(id: number, orderId: number, expectedSessionId?: string) {
  const result = await mutateOrError(async () => {
    if ([id, orderId].some((value) => !Number.isInteger(value) || value < 1 || value > MAX_INT))
      throw new ApiError(400, 'Invalid product or order id');
    return await removeProduct(id);
  }, expectedSessionId);
  if (result.ok) {
    updateTag(productsTag);
    updateTag('orders');
    updateTag(`order:${orderId}`);
    refresh();
  }
  return result;
}
