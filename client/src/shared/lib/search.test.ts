import { describe, expect, it } from 'vitest';

import { matchesQuery, serialLabel } from './search';

describe('matchesQuery', () => {
  it('matches everything for an empty query', () => {
    expect(matchesQuery('', 'anything')).toBe(true);
    expect(matchesQuery('   ', 'anything')).toBe(true);
    expect(matchesQuery('')).toBe(true);
  });

  it('finds a part of any of the texts, ignoring letter case', () => {
    expect(matchesQuery('mon', 'Monitors')).toBe(true);
    expect(matchesQuery('MONITORS', 'monitors')).toBe(true);
    expect(matchesQuery('dell', 'Keyboard', 'Dell UltraSharp')).toBe(true);
  });

  it('works with Cyrillic and ignores the spaces around the query', () => {
    expect(matchesQuery('  ПРИХОД ', 'Короткий приход')).toBe(true);
    expect(matchesQuery('длиннючее', 'Длинное предлинное длиннючее название')).toBe(true);
  });

  it('matches numbers as text', () => {
    expect(matchesQuery('1234', 12_345_671)).toBe(true);
    expect(matchesQuery('99', 12_345_671)).toBe(false);
  });

  it('does not match when no text contains the query', () => {
    expect(matchesQuery('printer', 'Monitors', 'Laptops')).toBe(false);
  });

  it('treats characters of a regular expression as plain text', () => {
    expect(matchesQuery('.*', 'Monitors')).toBe(false);
    expect(matchesQuery('(', 'a (b)')).toBe(true);
  });
});

describe('serialLabel', () => {
  it('prints the serial number as the lists show it', () => {
    expect(serialLabel(12_345_671)).toBe('SN-12345671');
    expect(matchesQuery('sn-1234', serialLabel(12_345_671))).toBe(true);
  });
});
