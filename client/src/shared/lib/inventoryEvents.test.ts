import { describe, expect, it, vi } from 'vitest';

import {
  MAX_CHANGES_PER_BATCH,
  parseChangeBatch,
  parseServerChange,
  publishInventoryChange,
  subscribeInventoryChanges,
} from './inventoryEvents';

describe('server change parsing', () => {
  it.each([
    [
      { type: 'order.created', orderId: 3 },
      { type: 'order.created', orderId: 3 },
    ],
    [
      { type: 'order.deleted', orderId: 3, extra: 'dropped' },
      { type: 'order.deleted', orderId: 3 },
    ],
    [
      { type: 'product.created', productId: 9, orderId: 3 },
      { type: 'product.created', productId: 9, orderId: 3 },
    ],
    [
      { type: 'product.deleted', productId: 9, orderId: 3 },
      { type: 'product.deleted', productId: 9, orderId: 3 },
    ],
  ])('accepts %j', (payload, expected) => {
    expect(parseServerChange(payload)).toEqual(expected);
  });
  it.each([
    null,
    undefined,
    'order.created',
    42,
    [],
    {},
    { type: 'order.created' },
    { type: 'order.created', orderId: 0 },
    { type: 'order.created', orderId: 1.5 },
    { type: 'order.created', orderId: '3' },
    { type: 'product.created', orderId: 3 },
    { type: 'product.deleted', productId: 3 },
    { type: 'session.opened', sessionId: 'a' },
    { type: 'resync' },
  ])('rejects %j from the server', (payload) => {
    expect(parseServerChange(payload)).toBeUndefined();
  });
});

describe('change batch parsing', () => {
  it('accepts server changes and the client-made resync', () => {
    expect(parseChangeBatch([{ type: 'resync' }, { type: 'order.deleted', orderId: 2 }])).toEqual([
      { type: 'resync' },
      { type: 'order.deleted', orderId: 2 },
    ]);
  });
  it.each([
    null,
    {},
    [],
    [{ type: 'resync' }, { type: 'nope' }],
    [{ type: 'order.created', orderId: -1 }],
    Array.from({ length: MAX_CHANGES_PER_BATCH + 1 }, () => ({ type: 'resync' })),
  ])('rejects the whole batch %j', (payload) => {
    expect(parseChangeBatch(payload)).toBeUndefined();
  });
  it('accepts a batch of exactly the maximum size', () => {
    const batch = Array.from({ length: MAX_CHANGES_PER_BATCH }, () => ({ type: 'resync' }));
    expect(parseChangeBatch(batch)).toHaveLength(MAX_CHANGES_PER_BATCH);
  });
});

describe('inventory change channel', () => {
  it('delivers to every subscriber until it unsubscribes', () => {
    const first = vi.fn();
    const second = vi.fn();
    const stop = subscribeInventoryChanges(first);
    subscribeInventoryChanges(second)();
    publishInventoryChange({ type: 'resync' });
    stop();
    publishInventoryChange({ type: 'resync' });
    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();
  });
});
