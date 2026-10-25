'use server';

import { refresh, updateTag } from 'next/cache';

import { loadOrError } from '@/shared/api/server';
import type { NewProduct } from '@/shared/api/types';
import { MAX_INT } from '@/shared/lib/limits';

import { postProduct, productsTag, removeProduct } from './api/products';

export async function createProduct(product: NewProduct) {
  const result = await loadOrError(() => postProduct(product));
  if (result.ok) {
    updateTag(productsTag);
    updateTag('orders');
    updateTag(`order:${result.data.order}`);
  }
  return result;
}

export async function deleteProduct(id: number, orderId: number) {
  if ([id, orderId].some((value) => !Number.isInteger(value) || value < 1 || value > MAX_INT))
    return { ok: false as const, error: 'Invalid product or order id' };
  const result = await loadOrError(() => removeProduct(id));
  if (result.ok) {
    updateTag(productsTag);
    updateTag('orders');
    updateTag(`order:${orderId}`);
    refresh();
  }
  return result;
}
