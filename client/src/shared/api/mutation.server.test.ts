import { beforeEach, describe, expect, it, vi } from 'vitest';

import { testSession } from '@/testing/auth';

import { ApiError } from './errors';
import { mutateOrError } from './mutation.server';

const state = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock('./session.server', () => ({ readSession: state.session }));
beforeEach(() => {
  state.session.mockReset();
  state.session.mockResolvedValue(testSession);
});
describe('authorization in Server Actions', () => {
  it('rejects guests and changed sessions before a write', async () => {
    const write = vi.fn(() => Promise.resolve(7));
    state.session.mockRejectedValueOnce(new ApiError(401, 'guest'));
    expect(await mutateOrError(write)).toMatchObject({ ok: false, authenticationRequired: true });
    expect(await mutateOrError(write, 'another-session')).toMatchObject({
      ok: false,
      authenticationRequired: true,
    });
    expect(write).not.toHaveBeenCalled();
  });
  it('allows an active matching session and propagates deliberate authentication loss', async () => {
    expect(await mutateOrError(() => Promise.resolve(7), testSession.sessionId)).toEqual({
      ok: true,
      data: 7,
    });
    expect(await mutateOrError(() => Promise.reject(new ApiError(401, 'revoked')))).toMatchObject({
      ok: false,
      authenticationRequired: true,
    });
  });
  it('never swallows framework redirects or reports cache errors as authorization', async () => {
    const redirect = Object.assign(new Error('redirect'), {
      digest: 'NEXT_REDIRECT;replace;/login;307;',
    });
    await expect(mutateOrError(() => Promise.reject(redirect))).rejects.toBe(redirect);
    expect(await mutateOrError(() => Promise.reject(new Error('DB unavailable')))).toEqual({
      ok: false,
      error: 'DB unavailable',
    });
  });
});
