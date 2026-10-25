import { describe, expect, it } from 'vitest';

import {
  isValidIsoDate,
  moneyField,
  optionalDateField,
  parseMoney,
  requiredDateField,
  textField,
  titleField,
  wholeNumberField,
} from './formSchema';

/** The message of the first problem, or `undefined` when the value passes. */
const problem = (
  field: {
    safeParse: (value: unknown) => { success: boolean; error?: { issues: { message: string }[] } };
  },
  value: unknown,
) => field.safeParse(value).error?.issues[0]?.message;

describe('isValidIsoDate', () => {
  it.each(['2017-06-29', '2020-02-29', '1000-01-01', '9999-12-31'])('accepts %s', (value) => {
    expect(isValidIsoDate(value)).toBe(true);
  });

  it.each([
    '',
    '2017-6-29',
    '2019-02-29',
    '2017-13-01',
    '2017-00-10',
    '2017-04-31',
    '0999-12-31',
    '2017-06-29T10:00',
    'soon',
  ])('rejects %j', (value) => {
    expect(isValidIsoDate(value)).toBe(false);
  });
});

describe('titleField', () => {
  const field = titleField('Введите название');

  it('trims and requires text', () => {
    expect(field.parse('  Order  ')).toBe('Order');
    expect(problem(field, '   ')).toBe('Введите название');
  });

  it('counts characters like the database does: an emoji is one', () => {
    expect(problem(field, '😀'.repeat(255))).toBeUndefined();
    expect(problem(field, 'a'.repeat(256))).toBe('maxTitle');
  });
});

describe('textField', () => {
  it('may stay empty and limits the size in bytes', () => {
    expect(problem(textField, '')).toBeUndefined();
    expect(problem(textField, 'a'.repeat(65_535))).toBeUndefined();
    expect(problem(textField, '😀'.repeat(20_000))).toBe('maxText');
  });
});

describe('date fields', () => {
  it('lets an optional date stay empty but not be half typed', () => {
    expect(problem(optionalDateField, '')).toBeUndefined();
    expect(problem(optionalDateField, '2017-06-29')).toBeUndefined();
    expect(problem(optionalDateField, '2017-06')).toBe('dateIncomplete');
  });

  it('requires a date', () => {
    expect(problem(requiredDateField, '')).toBe('dateRequired');
    expect(problem(requiredDateField, '2017-02-30')).toBe('dateIncomplete');
    expect(problem(requiredDateField, '2017-06-29')).toBeUndefined();
  });
});

describe('wholeNumberField', () => {
  const field = wholeNumberField('Введите номер');

  it('accepts a positive whole number that fits an INT column', () => {
    expect(problem(field, '1234')).toBeUndefined();
    expect(problem(field, ' 2147483647 ')).toBeUndefined();
  });

  it.each([
    ['', 'Введите номер'],
    ['12a', 'digits'],
    ['1.5', 'digits'],
    ['-3', 'digits'],
    ['0', 'positive'],
    ['2147483648', 'maxNumber'],
  ])('rejects %j: %s', (value, message) => {
    expect(problem(field, value)).toBe(message);
  });
});

describe('moneyField', () => {
  const field = moneyField('Введите цену');

  it.each(['0', '100', '99.5', '99,50', ' 12.05 ', '9999999999.99'])('accepts %j', (value) => {
    expect(problem(field, value)).toBeUndefined();
  });

  it.each(['', '-5', '1.234', '1,', '.5', 'abc', '1e3', '10 000'])('rejects %j', (value) => {
    expect(problem(field, value)).toBeDefined();
  });

  it('refuses an amount that does not fit DECIMAL(12,2)', () => {
    expect(problem(field, '10000000000')).toBe('maxMoney');
  });
});

describe('parseMoney', () => {
  it('reads a comma as a decimal point', () => {
    expect(parseMoney('99,5')).toBe(99.5);
    expect(parseMoney(' 100 ')).toBe(100);
  });
});
