/** Data Cache tags of the inventory reads. Reads attach them and every invalidation names the same ones. */
export const tags = {
  orders: 'orders',
  products: 'products',
  statistics: 'statistics',
  /** One order's details; also tagged with `orderDetails` so a resync can expire them all without ids. */
  order: (id: number) => `order:${id}`,
  orderDetails: 'order-details',
} as const;
