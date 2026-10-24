import { describe, expect, it } from 'vitest';

import { parseType, parseTypeParam } from './searchParams';

const types = ['Keyboards', 'Monitors'];

describe('parseTypeParam', () => {
  it('returns a single value, trimmed', () => {
    expect(parseTypeParam('Monitors')).toBe('Monitors');
    expect(parseTypeParam(' Monitors ')).toBe('Monitors');
  });

  it('treats a missing, repeated or over-long value as "all"', () => {
    expect(parseTypeParam(undefined)).toBe('');
    expect(parseTypeParam(['Monitors', 'Keyboards'])).toBe('');
    expect(parseTypeParam('x'.repeat(101))).toBe('');
  });
});

describe('parseType', () => {
  it('returns the type as it is spelled in the list', () => {
    expect(parseType('Monitors', types)).toBe('Monitors');
  });

  it('ignores letter case, like the API does', () => {
    expect(parseType('monitors', types)).toBe('Monitors');
    expect(parseType('KEYBOARDS', types)).toBe('Keyboards');
  });

  it.each(['', 'Printers', 'Monitors ', '__proto__', 'constructor'])(
    'treats %j as "all"',
    (value) => {
      expect(parseType(value, types)).toBe('');
    },
  );
});
