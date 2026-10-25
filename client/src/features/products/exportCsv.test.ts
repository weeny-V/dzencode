import { describe, expect, it } from 'vitest';

import { product } from '@/testing/fixtures';

import { buildProductsCsv, type ProductsCsvHeaders } from './exportCsv';

const headers: ProductsCsvHeaders = {
  id: 'ID',
  title: 'Title',
  serialNumber: 'Serial',
  type: 'Type',
  isNew: 'New',
  guaranteeStart: 'From',
  guaranteeEnd: 'To',
  priceUah: 'UAH',
  priceUsd: 'USD',
  orderId: 'Order ID',
  order: 'Order',
  specification: 'Spec',
  yes: 'yes',
  no: 'no',
};

describe('products CSV', () => {
  const item = {
    ...product,
    id: 3,
    title: 'Monitor; 27"',
    serialNumber: 1234,
    type: 'Monitors',
    isNew: true,
    guarantee: { start: '2017-06-29T21:00:00.000Z', end: '2019-06-29T21:00:00.000Z' },
    price: [
      { value: 99.9, symbol: 'USD', isDefault: false },
      { value: 2500, symbol: 'UAH', isDefault: true },
    ],
    order: 7,
    orderTitle: 'Order 7',
    specification: null,
  };
  it('writes one row per product with the localized yes/no and prices by currency', () => {
    const text = buildProductsCsv({
      locale: 'ru',
      headers,
      products: [item, { ...item, id: 4, isNew: false, price: [] }],
    });
    const lines = text.slice(1).split('\r\n');
    expect(lines[0]).toBe('ID;Title;Serial;Type;New;From;To;UAH;USD;Order ID;Order;Spec');
    expect(lines[1]).toBe(
      '3;"Monitor; 27""";1234;Monitors;yes;2017-06-29;2019-06-29;2500;99,9;7;Order 7;',
    );
    expect(lines[2]).toContain(';no;');
    expect(lines[2]).toContain(';;;7;');
  });
  it('uses the English delimiter and decimal point', () => {
    const text = buildProductsCsv({ locale: 'en', headers, products: [item] });
    expect(text.split('\r\n')[1]).toBe(
      '3,"Monitor; 27""",1234,Monitors,yes,2017-06-29,2019-06-29,2500,99.9,7,Order 7,',
    );
  });
});
