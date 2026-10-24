import { describe, expect, it } from 'vitest';

import { parseType } from './searchParams';

const types = ['Keyboards', 'Monitors'];

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

  it('treats a missing or repeated parameter as "all"', () => {
    expect(parseType(undefined, types)).toBe('');
    expect(parseType(['Monitors', 'Keyboards'], types)).toBe('');
  });
});
