import { describe, expect, it } from 'vitest';

import { currencySign, formatAmount } from './money';

// In the expected values `_` stands for the non-breaking space that separates the groups of thousands.
const nbsp = (text: string): string => text.replaceAll('_', String.fromCharCode(0xa0));

describe('formatAmount', () => {
  it.each([
    [0, '0'],
    [50, '50'],
    [50.25, '50.25'],
    [999, '999'],
    [1000, '1_000'],
    [250_000.5, '250_000.50'],
    [1_234_567.891, '1_234_567.89'],
    [999.999, '1_000'],
    [9_999_999_999.99, '9_999_999_999.99'],
  ])('formats %s as %j', (value, expected) => {
    expect(formatAmount(value, 'ru')).toBe(nbsp(expected.replace('.', ',')));
  });

  it('uses a non-breaking space, so a price never wraps in the middle', () => {
    expect(formatAmount(1000, 'ru')).not.toContain(' ');
    expect(formatAmount(1000, 'ru')).toContain(String.fromCharCode(0xa0));
  });
});

describe('English amounts', () => {
  it('uses comma groups and a decimal point', () => {
    expect(formatAmount(1234567.89, 'en')).toBe('1,234,567.89');
  });
});

describe('currencySign', () => {
  it('uses signs for known currencies and the code for the rest', () => {
    expect(currencySign('USD')).toBe('$');
    expect(currencySign('EUR')).toBe('€');
    expect(currencySign('UAH')).toBe('UAH');
  });
});
