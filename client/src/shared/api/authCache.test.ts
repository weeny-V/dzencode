import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { testSession } from '@/testing/auth';

import { ApiError } from './errors';
import { getJson, loadOrError } from './server';

const state = vi.hoisted(() => ({
  identity: { userId: 1, sessionId: 'a'.repeat(64), token: 'private-bearer-A' },
  denied: false,
  cacheLookup: vi.fn(),
  values: new Map<string, unknown>(),
  keys: [] as string[],
}));
afterEach(() => vi.unstubAllGlobals());
vi.mock('./session.server', () => ({
  requireSession: () => {
    if (state.denied)
      return Promise.reject(
        Object.assign(new Error('redirect'), { digest: 'NEXT_REDIRECT;replace;/login;307;' }),
      );
    return Promise.resolve({
      token: state.identity.token,
      sessionId: state.identity.sessionId,
      user: { id: state.identity.userId },
    });
  },
  redirectToLogin: () => {
    throw Object.assign(new Error('redirect'), { digest: 'NEXT_REDIRECT;replace;/login;307;' });
  },
}));
vi.mock('next/cache', () => ({
  unstable_cache: (read: () => Promise<unknown>, keys: string[]) => async () => {
    state.cacheLookup();
    const key = JSON.stringify(keys);
    state.keys.push(key);
    if (!state.values.has(key)) state.values.set(key, await read());
    return state.values.get(key);
  },
}));
beforeEach(() => {
  state.denied = false;
  state.identity = {
    userId: testSession.user.id,
    sessionId: 'a'.repeat(64),
    token: 'private-bearer-A',
  };
  state.values.clear();
  state.keys = [];
  state.cacheLookup.mockClear();
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(Response.json([{ id: 7 }]))),
  );
});
describe('authentication before persistent inventory cache', () => {
  it.each([
    '/orders',
    '/warehouses',
    '/graphql?query=%7BinventoryStatistics%7D&variables=%7B%22currency%22%3A%22UAH%22%7D',
    '/graphql?query=%7BinventoryStatistics%7D&variables=%7B%22currency%22%3A%22USD%22%7D',
  ])('denies a guest/revoked session after warming %s', async (path) => {
    expect(await getJson(path, { tags: ['inventory'] })).toEqual([{ id: 7 }]);
    expect(await getJson(path, { tags: ['inventory'] })).toEqual([{ id: 7 }]);
    expect(fetch).toHaveBeenCalledOnce();
    state.denied = true;
    const lookups = state.cacheLookup.mock.calls.length;
    await expect(getJson(path, { tags: ['inventory'] })).rejects.toHaveProperty(
      'digest',
      expect.stringContaining('NEXT_REDIRECT'),
    );
    expect(state.cacheLookup).toHaveBeenCalledTimes(lookups);
  });
  it.each(['/orders', '/warehouses', '/graphql?query=%7BinventoryGraph%7D'])(
    'isolates users/sessions for %s without persisting credentials',
    async (path) => {
      await getJson(path, { tags: ['inventory'] });
      state.identity = { userId: 2, sessionId: 'b'.repeat(64), token: 'private-bearer-B' };
      await getJson(path, { tags: ['inventory'] });
      state.identity = { userId: 1, sessionId: 'c'.repeat(64), token: 'private-bearer-C' };
      await getJson(path, { tags: ['inventory'] });
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(new Set(state.keys).size).toBe(3);
      expect(state.keys.join()).not.toContain('private-bearer');
      expect(state.keys.join()).toContain('sessionId');
    },
  );
  it('preserves Next control flow and handles upstream 401 deliberately', async () => {
    const redirect = Object.assign(new Error('redirect'), {
      digest: 'NEXT_REDIRECT;replace;/login;307;',
    });
    await expect(loadOrError(() => Promise.reject(redirect))).rejects.toBe(redirect);
    await expect(
      loadOrError(() => Promise.reject(new ApiError(401, 'revoked'))),
    ).rejects.toHaveProperty('digest', expect.stringContaining('NEXT_REDIRECT'));
  });
});
