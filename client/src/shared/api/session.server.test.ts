import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AUTH_COOKIE_AGE,
  clearSessionCookie,
  readSession,
  requireSession,
  setSessionCookie,
} from './session.server';

const state = vi.hoisted(() => ({
  token: undefined as string | undefined,
  set: vi.fn(),
  returnTo: '/products?type=Monitors',
  redirect: vi.fn((value: string): never => {
    throw new Error('REDIRECT:' + value);
  }),
}));
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: () => (state.token ? { value: state.token } : undefined),
      set: state.set,
    }),
  headers: () => Promise.resolve(new Headers({ 'x-inventory-return-to': state.returnTo })),
}));
vi.mock('next/navigation', () => ({ redirect: state.redirect }));
beforeEach(() => {
  state.token = undefined;
  state.set.mockClear();
  state.redirect.mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const user = {
  id: 1,
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  registeredAt: '2026-01-01Z',
};
describe('request-scoped session verification and cookies', () => {
  it('rejects a guest before fetching and redirects to a safe local return URL', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(readSession()).rejects.toMatchObject({ status: 401 });
    await expect(requireSession()).rejects.toThrow('REDIRECT:/login?returnTo=');
    expect(fetcher).not.toHaveBeenCalled();
    expect(state.redirect).toHaveBeenCalledWith('/login?returnTo=%2Fproducts%3Ftype%3DMonitors');
  });
  it('verifies the HttpOnly credential with no-store before exposing server identity', async () => {
    state.token = 'secret-token';
    const fetcher = vi.fn().mockResolvedValue(Response.json({ user, sessionId: 'a'.repeat(64) }));
    vi.stubGlobal('fetch', fetcher);
    expect(await readSession()).toMatchObject({
      user,
      sessionId: 'a'.repeat(64),
      token: 'secret-token',
    });
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.objectContaining({
        cache: 'no-store',
        headers: { Authorization: 'Bearer secret-token' },
        signal: expect.any(AbortSignal) as AbortSignal,
      }),
    );
  });
  it('redirects revoked/tampered credentials but preserves infrastructure failures', async () => {
    state.token = 'bad';
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ error: 'Authentication required' }, { status: 401 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(requireSession()).rejects.toThrow('REDIRECT:');
    fetcher.mockResolvedValue(Response.json({ error: 'Internal server error' }, { status: 500 }));
    await expect(requireSession()).rejects.toMatchObject({ status: 500 });
  });
  it('sets and clears a host-only long-lived cookie with HTTPS/local configuration', async () => {
    vi.stubEnv('AUTH_COOKIE_SECURE', 'false');
    await setSessionCookie('secret');
    expect(state.set).toHaveBeenLastCalledWith('dzencode_auth', 'secret', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: false,
      maxAge: AUTH_COOKIE_AGE,
    });
    vi.stubEnv('AUTH_COOKIE_SECURE', 'true');
    await clearSessionCookie();
    expect(state.set).toHaveBeenLastCalledWith('dzencode_auth', '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true,
      maxAge: 0,
    });
    vi.stubEnv('AUTH_COOKIE_SECURE', undefined);
    vi.stubEnv('NODE_ENV', 'production');
    await setSessionCookie('secret');
    expect(state.set.mock.lastCall?.[2]).toMatchObject({ secure: true });
  });
});
