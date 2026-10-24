import { describe, expect, it } from 'vitest';

import { mockOrders, mockProducts, mockProductTypes } from './inventory';

// The mock data stands in for the API until stage 3, so it has to be internally consistent.
describe('mock inventory', () => {
  it('puts every product into an existing order and copies that order title', () => {
    for (const product of mockProducts) {
      const order = mockOrders.find((item) => item.id === product.order);

      expect(order, `product ${product.id}`).toBeDefined();
      expect(product.orderTitle).toBe(order?.title);
    }
  });

  it('uses only known product types', () => {
    expect(mockProducts.every((product) => mockProductTypes.includes(product.type))).toBe(true);
  });

  it('has exactly one default price per product and no repeated currency', () => {
    for (const product of mockProducts) {
      const symbols = product.price.map((price) => price.symbol);

      expect(
        product.price.filter((price) => price.isDefault),
        `product ${product.id}`,
      ).toHaveLength(1);
      expect(new Set(symbols).size).toBe(symbols.length);
    }
  });

  it('has guarantee periods that do not end before they start', () => {
    expect(mockProducts.every((p) => p.guarantee.end >= p.guarantee.start)).toBe(true);
  });
});
