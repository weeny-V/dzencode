import { describe, expect, it } from 'vitest';

import { getOrder, listOrders } from './data';

// The data stands in for the API until stage 3, so it must keep the API's promises (docs/API.md).
describe('listOrders', () => {
  it('lists the newest order first', () => {
    // Order dates: 1 = Apr, 2 = Sep, 3 = Jun, 4 = Feb.
    expect(listOrders().map((order) => order.id)).toEqual([2, 3, 1, 4]);
  });

  it('counts the products of every order', () => {
    const counts = Object.fromEntries(listOrders().map((order) => [order.id, order.productsCount]));
    expect(counts).toEqual({ 1: 3, 2: 2, 3: 3, 4: 1 });
  });

  it('sums the prices per currency, ordered by currency code', () => {
    const order = listOrders().find((item) => item.id === 1);

    expect(order?.totals).toEqual([
      { symbol: 'UAH', value: 298_100.5, isDefault: true },
      { symbol: 'USD', value: 4350, isDefault: false },
    ]);
  });

  it('keeps a currency that only some products have', () => {
    // Order 3 has two products with a USD price and one (the keyboard) with UAH only.
    const order = listOrders().find((item) => item.id === 3);

    expect(order?.totals.map((total) => [total.symbol, total.value])).toEqual([
      ['UAH', 35_150.25],
      ['USD', 1350],
    ]);
  });
});

describe('listOrders with a search', () => {
  it('keeps an order whose title contains the text, ignoring letter case', () => {
    expect(listOrders('короткий').map((order) => order.id)).toEqual([4]);
    expect(listOrders('  КОРОТКИЙ ').map((order) => order.id)).toEqual([4]);
  });

  it('finds an order by the title of one of its products', () => {
    // 'iPhone' is a product of order 3; the other orders have no such product.
    expect(listOrders('iphone').map((order) => order.id)).toEqual([3]);
  });

  it('finds an order by the serial number of one of its products, typed as the lists show it', () => {
    // Product 5 (SN-12345675) belongs to order 2.
    expect(listOrders('sn-12345675').map((order) => order.id)).toEqual([2]);
  });

  it('keeps newest-first order and the whole order totals for the matching orders', () => {
    const orders = listOrders('длинное');

    expect(orders.map((order) => order.id)).toEqual([2, 3, 1]);
    // The search matched the title, but the count and the totals still describe all products of the order.
    expect(orders.find((order) => order.id === 1)?.productsCount).toBe(3);
  });

  it('returns nothing when nothing matches and everything for an empty search', () => {
    expect(listOrders('такого нет')).toEqual([]);
    expect(listOrders('')).toHaveLength(4);
    expect(listOrders('   ')).toHaveLength(4);
  });
});

describe('getOrder', () => {
  it('returns the order with its own products only', () => {
    const order = getOrder(2);

    expect(order?.title).toBe('Длинное название прихода');
    expect(order?.products.map((product) => product.id)).toEqual([4, 5]);
    expect(order?.products.every((product) => product.order === 2)).toBe(true);
  });

  it('returns undefined for an unknown order', () => {
    expect(getOrder(999)).toBeUndefined();
    expect(getOrder(0)).toBeUndefined();
  });
});
