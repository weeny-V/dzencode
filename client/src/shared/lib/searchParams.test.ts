import { describe, expect, it } from 'vitest';

import { parsePositiveInt, parseSearch, toQuery, withParam } from './searchParams';

describe('parseSearch', () => {
  it('trims a single value', () => {
    expect(parseSearch('  monitor ')).toBe('monitor');
    expect(parseSearch('Длинное')).toBe('Длинное');
  });

  it.each([undefined, ['a', 'b'], '', '   '])('treats %j as no search', (value) => {
    expect(parseSearch(value)).toBe('');
  });

  it('ignores an over-long value instead of filtering by it', () => {
    expect(parseSearch('a'.repeat(100))).toHaveLength(100);
    expect(parseSearch('a'.repeat(101))).toBe('');
  });
});

describe('toQuery', () => {
  it('builds a query string and leaves out empty values', () => {
    expect(toQuery({ order: '2', q: 'abc' })).toBe('?order=2&q=abc');
    expect(toQuery({ order: undefined, q: '' })).toBe('');
  });

  it('encodes special characters', () => {
    expect(toQuery({ q: 'a b&c' })).toBe('?q=a+b%26c');
    expect(toQuery({ q: 'приход' })).toBe('?q=%D0%BF%D1%80%D0%B8%D1%85%D0%BE%D0%B4');
  });
});

describe('withParam', () => {
  const current = new URLSearchParams('order=2&type=Monitors');

  it('sets a parameter and keeps the others', () => {
    expect(withParam(current, 'q', 'abc')).toBe('?order=2&type=Monitors&q=abc');
  });

  it('replaces an existing value', () => {
    expect(withParam(new URLSearchParams('q=old&order=2'), 'q', 'new')).toBe('?q=new&order=2');
  });

  it('removes a parameter when the value is empty and returns an empty string when nothing is left', () => {
    expect(withParam(new URLSearchParams('q=old&order=2'), 'q', '')).toBe('?order=2');
    expect(withParam(new URLSearchParams('q=old'), 'q', '')).toBe('');
  });

  it('does not change the object it was given', () => {
    withParam(current, 'q', 'abc');
    expect(current.toString()).toBe('order=2&type=Monitors');
  });
});

describe('parsePositiveInt', () => {
  it('reads a positive integer', () => {
    expect(parsePositiveInt('2')).toBe(2);
    expect(parsePositiveInt('1234567890')).toBe(1_234_567_890);
  });

  it.each(['', '0', '-1', '1.5', '007', 'abc', ' 2', '12345678901'])('ignores %j', (value) => {
    expect(parsePositiveInt(value)).toBeUndefined();
  });

  it('ignores a missing or repeated parameter', () => {
    expect(parsePositiveInt(undefined)).toBeUndefined();
    expect(parsePositiveInt(['1', '2'])).toBeUndefined();
  });
});
