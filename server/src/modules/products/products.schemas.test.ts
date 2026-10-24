import { describe, expect, it } from 'vitest';

import { parseProductFilter, parseProductInput } from './products.schemas.js';

const validProduct = {
  title: 'Monitor',
  serialNumber: 42,
  isNew: true,
  type: 'Monitors',
  guarantee: { start: '2020-01-01T00:00:00Z', end: '2021-01-01T00:00:00Z' },
  price: [
    { value: 100, symbol: 'USD', isDefault: false },
    { value: 2600, symbol: 'UAH', isDefault: true },
  ],
  order: 1,
};

describe('parseProductInput', () => {
  it('parses a valid product', () => {
    const product = parseProductInput(validProduct);
    expect(product.guarantee.start).toEqual(new Date('2020-01-01T00:00:00Z'));
    expect(product.photo).toBeNull();
    expect(product.price).toHaveLength(2);
  });

  it('requires exactly one default price', () => {
    const price = validProduct.price.map((item) => ({ ...item, isDefault: false }));
    expect(() => parseProductInput({ ...validProduct, price })).toThrow(
      'exactly one price must have isDefault: true',
    );
  });

  it('rejects duplicate currencies', () => {
    const price = [
      { value: 1, symbol: 'USD', isDefault: true },
      { value: 2, symbol: 'USD', isDefault: false },
    ];
    expect(() => parseProductInput({ ...validProduct, price })).toThrow(
      'price symbols must be unique',
    );
  });

  it('rejects a guarantee that ends before it starts', () => {
    const guarantee = { start: '2021-01-01T00:00:00Z', end: '2020-01-01T00:00:00Z' };
    expect(() => parseProductInput({ ...validProduct, guarantee })).toThrow(
      'guarantee.end must not be earlier than guarantee.start',
    );
  });

  it('upper-cases currency codes so usd and USD are the same currency', () => {
    const price = [{ value: 1, symbol: 'usd', isDefault: true }];
    expect(parseProductInput({ ...validProduct, price }).price[0]?.symbol).toBe('USD');
  });

  it('rejects usd and USD in one product', () => {
    const price = [
      { value: 1, symbol: 'USD', isDefault: true },
      { value: 2, symbol: 'usd', isDefault: false },
    ];
    expect(() => parseProductInput({ ...validProduct, price })).toThrow(
      'price symbols must be unique',
    );
  });

  it.each([1e20, 10_000_000_000, -1, Number.NaN, Infinity, '5'])(
    'rejects the price value %j',
    (value) => {
      const price = [{ value, symbol: 'USD', isDefault: true }];
      expect(() => parseProductInput({ ...validProduct, price })).toThrow(
        'must be a number between 0 and',
      );
    },
  );

  it('rejects more than two decimal places instead of rounding silently', () => {
    const price = [{ value: 0.001, symbol: 'USD', isDefault: true }];
    expect(() => parseProductInput({ ...validProduct, price })).toThrow('at most 2 decimal places');
  });

  it('accepts the largest DECIMAL(12,2) value and ordinary cents', () => {
    const price = [
      { value: 9_999_999_999.99, symbol: 'USD', isDefault: true },
      { value: 0.29, symbol: 'UAH', isDefault: false },
    ];
    expect(parseProductInput({ ...validProduct, price }).price).toHaveLength(2);
  });

  it.each(['serialNumber', 'order'])('rejects %s above the INT range', (key) => {
    expect(() => parseProductInput({ ...validProduct, [key]: 3_000_000_000 })).toThrow(
      `${key} must be an integer`,
    );
  });

  it('limits the specification by bytes', () => {
    const specification = '😀'.repeat(20_000);
    expect(() => parseProductInput({ ...validProduct, specification })).toThrow('65535 bytes');
  });

  it('rejects a non-ISO guarantee date', () => {
    const guarantee = { start: 'soon', end: '2021-01-01T00:00:00Z' };
    expect(() => parseProductInput({ ...validProduct, guarantee })).toThrow('ISO 8601');
  });

  it('rejects a non-boolean isNew', () => {
    expect(() => parseProductInput({ ...validProduct, isNew: 1 })).toThrow(
      'isNew must be true or false',
    );
  });
});

describe('parseProductFilter', () => {
  it('treats a missing or empty type as no filter', () => {
    expect(parseProductFilter({})).toEqual({});
    expect(parseProductFilter({ type: '' })).toEqual({});
  });

  it('passes the type through', () => {
    expect(parseProductFilter({ type: 'Monitors' })).toEqual({ type: 'Monitors' });
  });

  it('rejects a repeated parameter', () => {
    expect(() => parseProductFilter({ type: ['a', 'b'] })).toThrow('type must be a single string');
  });
});
