import { describe, expect, it } from 'vitest';

import { buildOrdersCsv, type OrdersCsvHeaders, type OrdersCsvPayload } from './exportCsv';

const headers: OrdersCsvHeaders = {
  id: 'ID',
  title: 'Title',
  description: 'Description',
  date: 'Date',
  warehouse: 'Warehouse',
  products: 'Products',
  totalUah: 'Total UAH',
  totalUsd: 'Total USD',
};
const payload = (locale: 'en' | 'ru'): OrdersCsvPayload => ({
  locale,
  headers,
  data: {
    warehouses: [{ id: 1, name: 'Kyiv, main' }],
    orders: [
      {
        id: 5,
        title: 'Order "A"',
        description: null,
        date: '2017-06-29T21:00:00.000Z',
        productsCount: 2,
        totals: [
          { value: 1234.5, symbol: 'UAH', isDefault: true },
          { value: 50, symbol: 'USD', isDefault: false },
        ],
        warehouseId: 1,
      },
      {
        id: 6,
        title: '=HYPERLINK("http://evil.example")',
        description: 'Line one\nline two',
        date: '2020-01-02T00:00:00.000Z',
        productsCount: 0,
        totals: [],
        warehouseId: null,
      },
    ],
  },
});

describe('orders CSV', () => {
  it('writes the English document with commas and decimal points', () => {
    expect(buildOrdersCsv(payload('en')).slice(1)).toBe(
      [
        'ID,Title,Description,Date,Warehouse,Products,Total UAH,Total USD',
        '5,"Order ""A""",,2017-06-29,"Kyiv, main",2,1234.5,50',
        '6,"\'=HYPERLINK(""http://evil.example"")","Line one\nline two",2020-01-02,,0,,',
        '',
      ].join('\r\n'),
    );
  });
  it('writes the Russian document with semicolons and decimal commas', () => {
    const text = buildOrdersCsv(payload('ru'));
    expect(text.split('\r\n')[1]).toBe('5;"Order ""A""";;2017-06-29;Kyiv, main;2;1234,5;50');
  });
  it('neutralizes a formula in a title', () => {
    expect(buildOrdersCsv(payload('en'))).toContain(`"'=HYPERLINK(`);
  });
  it('writes only the header for no orders', () => {
    const empty = { ...payload('en'), data: { orders: [], warehouses: [] } };
    expect(buildOrdersCsv(empty).slice(1)).toBe(
      'ID,Title,Description,Date,Warehouse,Products,Total UAH,Total USD\r\n',
    );
  });
  it('builds a long list without a row limit', () => {
    const base = payload('en');
    const orders = Array.from({ length: 5000 }, (_, index) => ({
      ...base.data.orders[0],
      id: index + 1,
    }));
    const lines = buildOrdersCsv({ ...base, data: { ...base.data, orders } }).split('\r\n');
    expect(lines).toHaveLength(5002);
  });
});
