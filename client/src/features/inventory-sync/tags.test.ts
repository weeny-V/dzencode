import { describe, expect, it } from 'vitest';

import { tagsForChanges } from './tags';

describe('tags made stale by inventory changes', () => {
  it('expires orders, the order and statistics for a created order', () => {
    expect(tagsForChanges([{ type: 'order.created', orderId: 4 }]).sort()).toEqual(
      ['orders', 'order:4', 'statistics'].sort(),
    );
  });
  it('also expires products for a deleted order, which removes its products', () => {
    expect(tagsForChanges([{ type: 'order.deleted', orderId: 4 }]).sort()).toEqual(
      ['orders', 'order:4', 'products', 'statistics'].sort(),
    );
  });
  it.each(['product.created', 'product.deleted'] as const)(
    'expires products, the owning order and statistics for %s',
    (type) => {
      expect(tagsForChanges([{ type, productId: 9, orderId: 4 }]).sort()).toEqual(
        ['orders', 'order:4', 'products', 'statistics'].sort(),
      );
    },
  );
  it('merges a batch without duplicates', () => {
    const tags = tagsForChanges([
      { type: 'product.created', productId: 1, orderId: 4 },
      { type: 'product.created', productId: 2, orderId: 4 },
      { type: 'product.deleted', productId: 3, orderId: 5 },
    ]);
    expect(new Set(tags).size).toBe(tags.length);
    expect(tags).toEqual(expect.arrayContaining(['order:4', 'order:5']));
  });
  it('expires every cached order detail through the umbrella tag on a resync', () => {
    expect(tagsForChanges([{ type: 'resync' }]).sort()).toEqual(
      ['order-details', 'orders', 'products', 'statistics'].sort(),
    );
  });
});
