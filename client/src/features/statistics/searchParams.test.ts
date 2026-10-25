import { describe, expect, it } from 'vitest';

import { parseCurrency } from './searchParams';

describe('statistics currency', () => {
  it('accepts the explicit currencies', () => {
    expect(parseCurrency('USD')).toBe('USD');
    expect(parseCurrency('UAH')).toBe('UAH');
  });
  it.each([undefined, '', 'usd', 'EUR', ['USD', 'UAH']])('defaults invalid %s to UAH', (value) => {
    expect(parseCurrency(value)).toBe('UAH');
  });
});
