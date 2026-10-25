import { afterEach, describe, expect, it, vi } from 'vitest';

import { product } from '@/testing/fixtures';

import {
  getOrderOptions,
  getProducts,
  getProductTypes,
  postProduct,
  removeProduct,
} from './products';

afterEach(() => vi.unstubAllGlobals());

const requests: [string, (signal: AbortSignal) => Promise<unknown>][] = [
  ['list', (signal) => getProducts({ type: 'Monitors', query: 'test' }, signal)],
  ['types', (signal) => getProductTypes(signal)],
  ['order options', (signal) => getOrderOptions(signal)],
  ['create', (signal) => postProduct(product, signal)],
  ['delete', (signal) => removeProduct(9, signal)],
];

describe('product API cancellation', () => {
  it.each(requests)('cancels %s through the caller controller', async (_name, run) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener(
              'abort',
              () => reject(new DOMException('Cancelled', 'AbortError')),
              { once: true },
            );
          }),
      ),
    );
    const controller = new AbortController();
    const request = run(controller.signal);
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });
});
