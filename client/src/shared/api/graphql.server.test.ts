import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryGraphql } from './graphql.server';

const nextCache = vi.hoisted(() => ({ unstable_cache: vi.fn() }));
vi.mock('next/cache', () => nextCache);
beforeEach(() => {
  nextCache.unstable_cache.mockClear();
  nextCache.unstable_cache.mockImplementation((read: () => Promise<unknown>) => read);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const QUERY = `
  query ($currency: Currency!) {
    inventoryStatistics(currency: $currency) { value }
  }`;

describe('server GraphQL boundary', () => {
  it('sends a compact GET query with variables, the bearer token, tags and TTL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: { value: 1 } }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await queryGraphql(QUERY, { currency: 'USD' }, { tags: ['statistics'] })).toEqual({
      value: 1,
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/graphql');
    expect(parsed.searchParams.get('query')).toBe(
      'query ($currency: Currency!) { inventoryStatistics(currency: $currency) { value } }',
    );
    expect(JSON.parse(parsed.searchParams.get('variables')!)).toEqual({ currency: 'USD' });
    expect(init).toMatchObject({
      cache: 'no-store',
      headers: { Authorization: 'Bearer test-token' },
    });
    expect(nextCache.unstable_cache).toHaveBeenCalledWith(expect.any(Function), expect.any(Array), {
      tags: ['statistics'],
      revalidate: 60,
    });
  });
  it('turns GraphQL errors into a failed read instead of empty data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ errors: [{ message: 'limit must be 1 to 100' }] })),
    );
    await expect(queryGraphql(QUERY, {}, { tags: ['statistics'] })).rejects.toThrow(
      'limit must be 1 to 100',
    );
  });
  it('rejects an empty response body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: null })));
    await expect(queryGraphql(QUERY, {}, { tags: ['statistics'] })).rejects.toThrow('Empty');
  });
  it('keeps HTTP statuses of the transport, so a revoked session still redirects', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(Response.json({ error: 'Authentication required' }, { status: 401 })),
    );
    await expect(queryGraphql(QUERY, {}, { tags: ['statistics'] })).rejects.toThrow(
      'NEXT_REDIRECT',
    );
  });
});

vi.mock('@/shared/api/session.server', async () => {
  const { testSession } = await import('@/testing/auth');
  return {
    readSession: vi.fn(() => Promise.resolve(testSession)),
    requireSession: vi.fn(() => Promise.resolve(testSession)),
    redirectToLogin: vi.fn(() => {
      throw new Error('NEXT_REDIRECT');
    }),
  };
});
