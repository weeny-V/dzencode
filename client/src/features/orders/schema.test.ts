import { describe, expect, it } from 'vitest';

import { emptyOrderForm, orderFormSchema, toNewOrder } from './schema';

const messages = (values: Partial<typeof emptyOrderForm>) => {
  const result = orderFormSchema.safeParse({ ...emptyOrderForm, ...values });
  return result.success
    ? []
    : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
};

describe('orderFormSchema', () => {
  it('accepts a title alone', () => {
    expect(messages({ title: 'Order 1' })).toEqual([]);
  });

  it('requires a title', () => {
    expect(messages({ title: '  ' })).toEqual(['title: required']);
  });

  it('points at a half typed date', () => {
    expect(messages({ title: 'x', date: '2017-06' })).toEqual(['date: dateIncomplete']);
  });

  it('reports every field at once', () => {
    expect(messages({ title: '', date: 'x' })).toHaveLength(2);
  });
});

describe('toNewOrder', () => {
  it('trims the title and leaves out a blank description and date', () => {
    expect(
      toNewOrder({ title: '  Order 1 ', description: '  ', date: '', warehouseId: '' }),
    ).toEqual({
      title: 'Order 1',
      description: null,
      warehouseId: null,
    });
  });

  it('keeps a description and a date as typed', () => {
    expect(
      toNewOrder({
        title: 'Order 1',
        description: ' first ',
        date: '2017-06-29',
        warehouseId: '2',
      }),
    ).toEqual({
      title: 'Order 1',
      description: ' first ',
      warehouseId: 2,
      date: '2017-06-29',
    });
  });
});
