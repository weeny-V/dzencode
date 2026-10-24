import { describe, expect, it } from 'vitest';

import { containsPattern } from './like.js';

describe('containsPattern', () => {
  it('wraps the text in wildcards', () => {
    expect(containsPattern('mon')).toBe('%mon%');
  });

  it('escapes the characters that have a meaning in LIKE', () => {
    expect(containsPattern('50%')).toBe(String.raw`%50\%%`);
    expect(containsPattern('a_b')).toBe(String.raw`%a\_b%`);
    expect(containsPattern(String.raw`a\b`)).toBe(String.raw`%a\\b%`);
  });
});
