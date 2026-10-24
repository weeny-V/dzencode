import { describe, expect, it } from 'vitest';

import { parseOrderId } from './searchParams';

describe('parseOrderId', () => {
  it('reads a positive integer', () => {
    expect(parseOrderId('2')).toBe(2);
    expect(parseOrderId('1234567890')).toBe(1_234_567_890);
  });

  it.each(['', '0', '-1', '1.5', '007', 'abc', '2x', ' 2', '1e3', '12345678901', '%00'])(
    'ignores %j',
    (value) => {
      expect(parseOrderId(value)).toBeUndefined();
    },
  );

  it('ignores a missing or repeated parameter', () => {
    expect(parseOrderId(undefined)).toBeUndefined();
    expect(parseOrderId(['1', '2'])).toBeUndefined();
  });
});
