import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api/errors';
import { testSession } from '@/testing/auth';

import { inspectSession, logout, submitCredentials } from './actions';

const state = vi.hoisted(() => ({
  authenticate: vi.fn(),
  revoke: vi.fn(),
  read: vi.fn(),
  set: vi.fn(),
  clear: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock('./api/auth.server', () => ({
  authenticate: state.authenticate,
  revokeSession: state.revoke,
}));
vi.mock('@/shared/api/session.server', () => ({
  readSession: state.read,
  setSessionCookie: state.set,
  clearSessionCookie: state.clear,
}));
vi.mock('next/cache', () => ({ revalidatePath: state.revalidatePath }));
const registration = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  password: 'test password 123',
  passwordConfirmation: 'test password 123',
};
beforeEach(() => {
  vi.resetAllMocks();
  state.read.mockResolvedValue(testSession);
  state.authenticate.mockResolvedValue({ user: testSession.user, token: 'private-jwt' });
});
describe('credential Server Actions', () => {
  it.each(['login', 'register'] as const)(
    'sets the cookie server-side and returns no credentials from %s',
    async (mode) => {
      const result = await submitCredentials(mode, registration, '//evil.example');
      expect(result).toEqual({ ok: true, data: { returnTo: '/orders' } });
      expect(JSON.stringify(result)).not.toContain('private-jwt');
      expect(JSON.stringify(result)).not.toContain(registration.password);
      expect(state.set).toHaveBeenCalledWith('private-jwt');
      expect(state.revalidatePath).toHaveBeenCalledWith('/', 'layout');
    },
  );
  it('validates input before making a registration request', async () => {
    expect(
      await submitCredentials(
        'register',
        { ...registration, passwordConfirmation: 'wrong' },
        '/orders',
      ),
    ).toEqual({ ok: false, error: 'invalidInput' });
    expect(state.authenticate).not.toHaveBeenCalled();
    expect(state.set).not.toHaveBeenCalled();
  });
  it.each([
    [401, 'invalidCredentials'],
    [409, 'emailTaken'],
    [429, 'rateLimited'],
    [500, 'unavailable'],
  ] as const)(
    'returns localized codes for HTTP %s without setting a cookie',
    async (status, code) => {
      state.authenticate.mockRejectedValue(new ApiError(status, 'internal English detail'));
      expect(await submitCredentials('login', registration, '/users')).toEqual({
        ok: false,
        error: code,
      });
      expect(state.set).not.toHaveBeenCalled();
    },
  );
  it('revokes the matching current session before clearing the cookie', async () => {
    state.revoke.mockImplementation(() => {
      expect(state.clear).not.toHaveBeenCalled();
      return Promise.resolve();
    });
    expect(await logout(testSession.sessionId)).toEqual({ ok: true, data: undefined });
    expect(state.revoke).toHaveBeenCalledWith(testSession.token);
    expect(state.clear).toHaveBeenCalledOnce();
  });
  it('keeps a different account cookie and does not claim network failure revoked a session', async () => {
    expect(await logout('old-session')).toMatchObject({ ok: false, authenticationRequired: true });
    expect(state.revoke).not.toHaveBeenCalled();
    expect(state.clear).not.toHaveBeenCalled();
    state.revoke.mockRejectedValue(new Error('offline'));
    expect(await logout(testSession.sessionId)).toEqual({ ok: false, error: 'unavailable' });
    expect(state.clear).not.toHaveBeenCalled();
  });
  it('returns only safe identity from rechecks and distinguishes guests from outages', async () => {
    expect(await inspectSession()).toEqual({
      ok: true,
      data: { userId: 1, sessionId: testSession.sessionId },
    });
    state.read.mockRejectedValueOnce(new ApiError(401, 'guest'));
    expect(await inspectSession()).toEqual({ ok: true, data: null });
    state.read.mockRejectedValueOnce(new ApiError(500, 'unavailable'));
    expect(await inspectSession()).toEqual({ ok: false, error: 'unavailable' });
  });
});
