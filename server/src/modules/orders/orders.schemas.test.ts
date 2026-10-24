import { describe, expect, it } from 'vitest';

import { parseOrderFilter, parseOrderInput } from './orders.schemas.js';

describe('parseOrderInput', () => {
  it('fills optional fields', () => {
    const order = parseOrderInput({ title: '  Order  ' });
    expect(order.title).toBe('Order');
    expect(order.description).toBeNull();
    expect(order.date).toBeInstanceOf(Date);
  });

  it('requires a title', () => {
    expect(() => parseOrderInput({ title: ' ' })).toThrow('title is required');
  });

  it('limits the description by bytes', () => {
    expect(() => parseOrderInput({ title: 'x', description: '😀'.repeat(20_000) })).toThrow(
      '65535 bytes',
    );
  });

  it('requires an object body', () => {
    expect(() => parseOrderInput(undefined)).toThrow('body must be an object');
  });
});

describe('parseOrderFilter', () => {
  it('reads the search text, trimmed', () => {
    expect(parseOrderFilter({ q: '  Order ' })).toEqual({ query: 'Order' });
  });

  it('treats a missing or blank search as no filter', () => {
    expect(parseOrderFilter({})).toEqual({});
    expect(parseOrderFilter({ q: '' })).toEqual({});
  });

  it('rejects a repeated parameter', () => {
    expect(() => parseOrderFilter({ q: ['a', 'b'] })).toThrow('q must be a single string');
  });
});
