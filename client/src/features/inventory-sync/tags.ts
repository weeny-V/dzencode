import { tags } from '@/shared/api/tags';
import type { InventoryChange } from '@/shared/lib/inventoryEvents';

/**
 * The Data Cache tags that a change makes stale: the same sets the mutating Server Actions of the orders and
 * products features expire, so a write made in another tab, or straight against the API, ends in the same state.
 * A `resync` cannot name orders, so it expires the umbrella tag of every cached order detail.
 */
export const tagsForChanges = (changes: InventoryChange[]): string[] => {
  const result = new Set<string>();
  for (const change of changes) {
    if (change.type === 'resync') {
      for (const tag of [tags.orders, tags.products, tags.statistics, tags.orderDetails])
        result.add(tag);
      continue;
    }
    result.add(tags.statistics);
    result.add(tags.orders);
    result.add(tags.order(change.orderId));
    if (change.type.startsWith('product.') || change.type === 'order.deleted')
      result.add(tags.products);
    // A new order has no products yet, but the products form lists the orders: `orders` already covers it.
  }
  return [...result];
};
