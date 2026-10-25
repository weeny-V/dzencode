import { describe, expect, it } from 'vitest';

import { readAuthCookie } from './auth.cookies.js';

describe('socket cookie parsing', () => {
  it('reads only the exact cookie name', () => {
    expect(readAuthCookie('other=x; dzencode_auth=token.value; locale=en')).toBe('token.value');
  });
  it.each([
    undefined,
    '',
    'other=x',
    'prefix_dzencode_auth=x',
    'dzencode_auth=%ZZ',
    'dzencode_auth=a; dzencode_auth=b',
    'x'.repeat(16385),
  ])('rejects missing, malformed, ambiguous or oversized cookies', (header) => {
    expect(readAuthCookie(header)).toBeUndefined();
  });
});
