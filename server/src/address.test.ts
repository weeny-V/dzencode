import { describe, expect, it } from 'vitest';

import { formatAddress } from './address.js';

describe('formatAddress', () => {
  it('formats an IPv4 address', () => {
    expect(formatAddress({ address: '0.0.0.0', family: 'IPv4', port: 4000 })).toBe('0.0.0.0:4000');
  });

  it('wraps an IPv6 address in brackets', () => {
    expect(formatAddress({ address: '::', family: 'IPv6', port: 4000 })).toBe('[::]:4000');
  });

  it('passes pipe and socket paths through', () => {
    expect(formatAddress('/tmp/api.sock')).toBe('/tmp/api.sock');
  });

  it('handles a server that is not listening', () => {
    expect(formatAddress(null)).toBe('unknown address');
  });
});
