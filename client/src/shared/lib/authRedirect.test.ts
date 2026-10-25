import { describe, expect, it } from 'vitest';

import { loginHref, safeReturnTo } from './authRedirect';

describe('safe authentication return URLs', () => {
  it.each([
    undefined,
    null,
    [],
    'https://evil.example',
    '//evil.example',
    '/%2f/evil.example',
    '/%252f/evil.example',
    '/\\evil.example',
    '/orders%0d%0aLocation:evil',
    '/login',
    '/register',
    '/orders/../login',
    '/unknown',
    'orders',
    '/orders?' + 'q'.repeat(2050),
  ])('rejects external, malformed or public destinations: %j', (value) => {
    expect(safeReturnTo(value)).toBe('/orders');
  });
  it.each(['/orders?order=7&q=monitor', '/products/new?order=7', '/users', '/groups', '/settings'])(
    'preserves a supported local destination: %s',
    (value) => {
      expect(safeReturnTo(value)).toBe(value);
      expect(new URL(loginHref(value), 'http://local').searchParams.get('returnTo')).toBe(value);
    },
  );
});
