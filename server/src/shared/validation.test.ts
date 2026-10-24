import { describe, expect, it } from 'vitest';

import { ValidationError } from './errors.js';
import {
  MAX_INT,
  optionalDate,
  optionalText,
  parseDate,
  parseId,
  parseSearchQuery,
  requiredInt,
  requiredString,
} from './validation.js';

describe('parseId', () => {
  it('accepts positive integers', () => {
    expect(parseId('7')).toBe(7);
  });

  it.each(['0', '-1', '1.5', 'abc', '', '1e3', ' 5', '0x10', '+5', String(MAX_INT + 1)])(
    'rejects %j',
    (value) => {
      expect(() => parseId(value)).toThrow(ValidationError);
    },
  );

  it('rejects a missing value', () => {
    expect(() => parseId(undefined)).toThrow(ValidationError);
  });
});

describe('requiredString', () => {
  it('trims the value', () => {
    expect(requiredString({ title: '  x ' }, 'title')).toBe('x');
  });

  it('rejects blank and too long values', () => {
    expect(() => requiredString({ title: ' ' }, 'title')).toThrow('title is required');
    expect(() => requiredString({ title: 'abc' }, 'title', 2)).toThrow(
      'title must be at most 2 characters',
    );
  });

  it('counts characters like VARCHAR does: an emoji is one character', () => {
    expect(requiredString({ title: '😀😀' }, 'title', 2)).toBe('😀😀');
    expect(() => requiredString({ title: '😀😀😀' }, 'title', 2)).toThrow(ValidationError);
  });
});

describe('optionalText', () => {
  it('returns null when missing', () => {
    expect(optionalText({}, 'description')).toBeNull();
  });

  it('limits TEXT by bytes, not by characters', () => {
    // 20000 emoji are 20000 characters but 80000 bytes, over the 65535 bytes of a TEXT column.
    expect(() => optionalText({ description: '😀'.repeat(20_000) }, 'description')).toThrow(
      'description must be at most 65535 bytes',
    );
    expect(optionalText({ description: 'a'.repeat(65_535) }, 'description')).toHaveLength(65_535);
  });
});

describe('requiredInt', () => {
  it('accepts values that fit a MySQL INT', () => {
    expect(requiredInt({ n: MAX_INT }, 'n')).toBe(MAX_INT);
  });

  it.each([0, -1, 1.5, MAX_INT + 1, 3_000_000_000, '5', null])('rejects %j', (n) => {
    expect(() => requiredInt({ n }, 'n')).toThrow(ValidationError);
  });
});

describe('parseDate', () => {
  it('accepts ISO 8601 with a zone', () => {
    expect(parseDate('2017-06-29T12:09:33Z', 'date')).toEqual(new Date('2017-06-29T12:09:33Z'));
    expect(parseDate('2017-06-29T12:09:33+03:00', 'date')).toEqual(
      new Date('2017-06-29T09:09:33Z'),
    );
  });

  it('reads a date without a zone as UTC, whatever the server time zone is', () => {
    // The format used in docs/task-materials/app.js.
    expect(parseDate('2017-06-29 12:09:33', 'date')).toEqual(new Date('2017-06-29T12:09:33Z'));
    expect(parseDate('2017-06-29', 'date')).toEqual(new Date('2017-06-29T00:00:00Z'));
  });

  it('drops fractions of a second: DATETIME stores whole seconds', () => {
    expect(parseDate('2020-05-05T10:00:00.700Z', 'date').toISOString()).toBe(
      '2020-05-05T10:00:00.000Z',
    );
  });

  it.each([
    'Order 1',
    '2020',
    '2020-13-01',
    '2020-02-31',
    '2021-02-29',
    '2020-01-01T25:00:00Z',
    '2020-01-01T10:60:00Z',
    '+010000-01-01T00:00:00Z',
    '0999-12-31T00:00:00Z',
    '',
    '12:09:33',
  ])('rejects %j', (value) => {
    expect(() => parseDate(value, 'date')).toThrow(ValidationError);
  });

  it('accepts a leap day', () => {
    expect(parseDate('2020-02-29', 'date').toISOString()).toBe('2020-02-29T00:00:00.000Z');
  });

  it.each([42, null, undefined, {}])('rejects the non-string %j', (value) => {
    expect(() => parseDate(value, 'date')).toThrow(ValidationError);
  });
});

describe('optionalDate', () => {
  it('defaults to now, in whole seconds', () => {
    const date = optionalDate({}, 'date');
    expect(date.getUTCMilliseconds()).toBe(0);
    expect(Math.abs(date.getTime() - Date.now())).toBeLessThan(2000);
  });

  it('rejects an invalid date', () => {
    expect(() => optionalDate({ date: 'yesterday' }, 'date')).toThrow('date must be an ISO 8601');
  });
});

describe('parseSearchQuery', () => {
  it('trims the text', () => {
    expect(parseSearchQuery('  sn-123 ')).toBe('sn-123');
  });

  it('treats a missing or blank value as no search', () => {
    expect(parseSearchQuery(undefined)).toBeUndefined();
    expect(parseSearchQuery('')).toBeUndefined();
    expect(parseSearchQuery('   ')).toBeUndefined();
  });

  it('rejects a repeated parameter and an object', () => {
    expect(() => parseSearchQuery(['a', 'b'])).toThrow(ValidationError);
    expect(() => parseSearchQuery({ a: 'b' })).toThrow(ValidationError);
  });

  it('limits the length in characters', () => {
    expect(parseSearchQuery('я'.repeat(100))).toHaveLength(100);
    expect(() => parseSearchQuery('я'.repeat(101))).toThrow(ValidationError);
  });
});
