import { afterEach, describe, expect, it, vi } from 'vitest';

import { getOrder, getOrders, postOrder, removeOrder } from './orders';

afterEach(() => vi.unstubAllGlobals());

const requests: [string, (signal: AbortSignal) => Promise<unknown>][] = [
  ['list', (signal) => getOrders('monitor', signal)],
  ['details', (signal) => getOrder(7, signal)],
  ['create', (signal) => postOrder({ title: 'New order', description: null }, signal)],
  ['delete', (signal) => removeOrder(7, signal)],
];

describe('order API cancellation', () => {
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
