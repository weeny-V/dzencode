import { describe, expect, it } from 'vitest';

import { parseOrderInput } from './orders.schemas.js';

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
