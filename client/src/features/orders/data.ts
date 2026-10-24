import type { OrderDetails, OrderSummary } from '@/shared/api/types';
import type { Price } from '@/shared/lib/money';
import { matchesQuery, serialLabel } from '@/shared/lib/search';
import { mockOrders, mockProducts } from '@/shared/mocks/inventory';

// Stage 2 reads static data. In stage 3 these two functions call the API (`GET /orders?q=`, `GET /orders/:id`)
// and keep their signatures, so the components do not change.

const productsOf = (orderId: number) => mockProducts.filter((product) => product.order === orderId);

/** Sums the prices per currency, ordered by currency code, like `GET /orders` does. */
const totalsFor = (orderId: number): Price[] => {
  const bySymbol = new Map<string, Price>();
  for (const product of productsOf(orderId)) {
    for (const { value, symbol, isDefault } of product.price) {
      const total = bySymbol.get(symbol);
      bySymbol.set(symbol, {
        symbol,
        value: (total?.value ?? 0) + value,
        isDefault: (total?.isDefault ?? false) || isDefault,
      });
    }
  }
  return [...bySymbol.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
};

/**
 * Newest first, like `GET /orders`. A search keeps an order when its title or the title or serial number of any
 * of its products contains the query; the counts and totals still describe the whole order.
 */
export const listOrders = (query = ''): OrderSummary[] =>
  mockOrders
    .filter(
      (order) =>
        matchesQuery(query, order.title) ||
        productsOf(order.id).some((product) =>
          matchesQuery(query, product.title, serialLabel(product.serialNumber)),
        ),
    )
    .map((order) => ({
      ...order,
      productsCount: productsOf(order.id).length,
      totals: totalsFor(order.id),
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

export const getOrder = (id: number): OrderDetails | undefined => {
  const order = mockOrders.find((item) => item.id === id);
  return order && { ...order, products: [...productsOf(id)] };
};
