import { describe, expect, it } from 'vitest';

import {
  emptyProductForm,
  orderToPreselect,
  productFormSchema,
  type ProductFormValues,
  toNewProduct,
} from './schema';

const valid: ProductFormValues = {
  title: ' Monitor ',
  serialNumber: '1234',
  type: 'Monitors',
  order: '2',
  isNew: true,
  specification: '',
  guaranteeStart: '2017-06-29',
  guaranteeEnd: '2019-06-29',
  priceUsd: '100',
  priceUah: '2600',
};

/** The first message of every field, as the form shows it (a field may break several rules at once). */
const messages = (values: Partial<ProductFormValues>) => {
  const result = productFormSchema.safeParse({ ...valid, ...values });
  const first = new Map<string, string>();
  for (const issue of result.error?.issues ?? []) {
    const field = issue.path.join('.');
    if (!first.has(field)) first.set(field, issue.message);
  }
  return [...first].map(([field, message]) => `${field}: ${message}`);
};

describe('emptyProductForm', () => {
  it('preselects the order it is opened for, and only that', () => {
    expect(emptyProductForm(7).order).toBe('7');
    expect(emptyProductForm().order).toBe('');
  });

  it('starts as a new product', () => {
    expect(emptyProductForm().isNew).toBe(true);
  });
});

describe('productFormSchema', () => {
  it('accepts a complete form', () => {
    expect(messages({})).toEqual([]);
  });

  it('requires every field except the specification', () => {
    const result = productFormSchema.safeParse(emptyProductForm());

    expect(result.success).toBe(false);
    const fields = new Set(result.error?.issues.map((issue) => issue.path.join('.')));
    expect(fields).toEqual(
      new Set([
        'title',
        'serialNumber',
        'type',
        'order',
        'guaranteeStart',
        'guaranteeEnd',
        'priceUsd',
        'priceUah',
      ]),
    );
  });

  it('refuses a guarantee that ends before it starts, under the end date', () => {
    expect(messages({ guaranteeStart: '2019-06-29', guaranteeEnd: '2017-06-29' })).toEqual([
      'guaranteeEnd: guarantee',
    ]);
  });

  it('accepts a guarantee that ends the day it starts', () => {
    expect(messages({ guaranteeStart: '2019-06-29', guaranteeEnd: '2019-06-29' })).toEqual([]);
  });

  it('leaves the order of the dates alone while one of them is not a date yet', () => {
    expect(messages({ guaranteeStart: '2019-06-29', guaranteeEnd: '' })).toEqual([
      'guaranteeEnd: dateRequired',
    ]);
  });

  it('words a bad serial number and a bad price', () => {
    expect(messages({ serialNumber: '12a', priceUsd: '1.234' })).toEqual([
      'serialNumber: digits',
      'priceUsd: money',
    ]);
  });
});

describe('toNewProduct', () => {
  it('builds the body of POST /products', () => {
    expect(toNewProduct({ ...valid, priceUah: '2600,50' })).toEqual({
      title: 'Monitor',
      serialNumber: 1234,
      isNew: true,
      photo: null,
      type: 'Monitors',
      specification: null,
      guarantee: { start: '2017-06-29', end: '2019-06-29' },
      price: [
        { value: 100, symbol: 'USD', isDefault: false },
        { value: 2600.5, symbol: 'UAH', isDefault: true },
      ],
      order: 2,
    });
  });

  it('keeps a specification and the used state', () => {
    const product = toNewProduct({ ...valid, priceUah: '1', isNew: false, specification: 'IPS' });

    expect(product).toMatchObject({ isNew: false, specification: 'IPS' });
  });

  it('marks exactly one price as the main one', () => {
    const { price } = toNewProduct({ ...valid, priceUah: '1' });

    expect(price.filter((item) => item.isDefault)).toEqual([
      { value: 1, symbol: 'UAH', isDefault: true },
    ]);
  });
});

describe('orderToPreselect', () => {
  it('selects the order the form was opened for while the select is empty', () => {
    expect(orderToPreselect('', 7)).toBe('7');
  });

  it('keeps a choice the visitor made', () => {
    expect(orderToPreselect('3', 7)).toBeUndefined();
  });

  it('does nothing without an order to select', () => {
    expect(orderToPreselect('', undefined)).toBeUndefined();
  });
});
