import { describe, expect, it } from 'vitest';

import { listProducts, listProductTypes } from './data';

describe('listProducts', () => {
  it('returns all products without a filter', () => {
    expect(listProducts()).toHaveLength(9);
  });

  it('filters by type', () => {
    const monitors = listProducts('Monitors');

    expect(monitors.map((product) => product.id)).toEqual([1, 2, 5]);
    expect(monitors.every((product) => product.type === 'Monitors')).toBe(true);
  });

  it('returns nothing for a type without products', () => {
    expect(listProducts('Printers')).toEqual([]);
  });

  it('gives every product the title of the order it belongs to', () => {
    expect(listProducts().every((product) => product.orderTitle !== '')).toBe(true);
  });
});

describe('listProducts with a search', () => {
  it('matches the title, ignoring letter case', () => {
    expect(listProducts(undefined, 'DELL').map((product) => product.id)).toEqual([2]);
  });

  it('matches the serial number as the lists show it', () => {
    expect(listProducts(undefined, 'SN-12345679').map((product) => product.id)).toEqual([9]);
  });

  it('matches the type and the title of the order', () => {
    expect(listProducts(undefined, 'smartphones').map((product) => product.id)).toEqual([6, 9]);
    expect(listProducts(undefined, 'короткий приход').map((product) => product.id)).toEqual([9]);
  });

  it('combines with the type filter', () => {
    expect(listProducts('Monitors', 'ultra').map((product) => product.id)).toEqual([2, 5]);
    expect(listProducts('Laptops', 'ultra')).toEqual([]);
  });

  it('returns nothing when nothing matches and everything for an empty search', () => {
    expect(listProducts(undefined, 'принтер')).toEqual([]);
    expect(listProducts(undefined, '')).toHaveLength(9);
  });
});

describe('listProductTypes', () => {
  it('has a type for every product', () => {
    const types = new Set(listProductTypes());

    expect(listProducts().every((product) => types.has(product.type))).toBe(true);
  });
});
