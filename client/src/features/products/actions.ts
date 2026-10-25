'use server';

import { refresh, updateTag } from 'next/cache';

import { ApiError } from '@/shared/api/errors';
import { mutateOrError } from '@/shared/api/mutation.server';
import { loadOrError } from '@/shared/api/server';
import type { NewProduct, Product } from '@/shared/api/types';
import type { ActionResult } from '@/shared/lib/actionResult';
import { MAX_INT } from '@/shared/lib/limits';
import { parseSearch } from '@/shared/lib/searchParams';

import {
  getProducts,
  getProductTypes,
  postProduct,
  productsTag,
  removeProduct,
} from './api/products';
import { parseType, parseTypeParam } from './searchParams';

export async function createProduct(product: NewProduct, expectedSessionId?: string) {
  const result = await mutateOrError(() => postProduct(product), expectedSessionId);
  if (result.ok) {
    updateTag(productsTag);
    updateTag('orders');
    updateTag(`order:${result.data.order}`);
    updateTag('statistics');
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
    updateTag('statistics');
    refresh();
  }
  return result;
}

/** What the CSV export of the products page is made of: every product of the current type filter and search. */
export async function loadProductsExport(
  type: unknown,
  query: unknown,
): Promise<ActionResult<Product[]>> {
  const search = parseSearch(typeof query === 'string' ? query : undefined);
  const typeParam = parseTypeParam(typeof type === 'string' ? type : undefined);
  return loadOrError(async () => {
    // As on the page, an unknown type means all products.
    const selected = typeParam ? parseType(typeParam, await getProductTypes()) : '';
    return getProducts({ type: selected, query: search });
  });
}
