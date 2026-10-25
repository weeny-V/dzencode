import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DbExecutor, Transaction } from '../../shared/db/executor.js';
import { AuthenticationError } from '../../shared/errors.js';
import { TEST_REGISTRATION } from '../../shared/testing/auth.js';
import type { User, UserCredentials } from '../users/index.js';
import { createAuthService } from './auth.service.js';

const user: User = {
  id: 1,
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  registeredAt: new Date('2026-01-01Z'),
};
const executor = {} as DbExecutor;
const repository = { create: vi.fn(), isActive: vi.fn(), revoke: vi.fn() };
const users = { create: vi.fn(), findCredentials: vi.fn(), findById: vi.fn() };
const passwords = { hash: vi.fn(), verify: vi.fn() };
const tokens = { sign: vi.fn(), verify: vi.fn() };
const transaction: Transaction = (work) => work(executor);
let service: ReturnType<typeof createAuthService>;

beforeEach(() => {
  vi.resetAllMocks();
  users.create.mockResolvedValue(user);
  users.findCredentials.mockResolvedValue({
    ...user,
    passwordHash: 'hash',
  } satisfies UserCredentials);
  users.findById.mockResolvedValue(user);
  passwords.hash.mockResolvedValue('hash');
  passwords.verify.mockResolvedValue(true);
  tokens.sign.mockResolvedValue('token');
  tokens.verify.mockResolvedValue({ userId: 1, sessionId: 'sid' });
  repository.isActive.mockResolvedValue(true);
  service = createAuthService({ repository, users, passwords, tokens, transaction });
});

describe('auth service', () => {
  it('registers user/session in the same transaction without storing plaintext or confirmation', async () => {
    expect(await service.register(TEST_REGISTRATION)).toEqual({ user, token: 'token' });
    expect(users.create).toHaveBeenCalledWith(
      { firstName: 'Test', lastName: 'User', email: 'test@example.com', passwordHash: 'hash' },
      executor,
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
      1,
      executor,
    );
    expect(tokens.sign).toHaveBeenCalledWith(1, expect.stringMatching(/^[a-f0-9]{64}$/));
  });
  it('does not insert a session when user creation fails', async () => {
    users.create.mockRejectedValue(new Error('conflict'));
    await expect(service.register(TEST_REGISTRATION)).rejects.toThrow('conflict');
    expect(repository.create).not.toHaveBeenCalled();
  });
  it('returns only safe current-user fields from login', async () => {
    expect(await service.login(TEST_REGISTRATION)).toEqual({ user, token: 'token' });
    expect(repository.create).toHaveBeenCalledWith(expect.any(String), 1);
  });
  it.each([true, false])(
    'uses identical credential errors for unknown user: %s',
    async (unknownUser) => {
      if (unknownUser) users.findCredentials.mockResolvedValue(undefined);
      passwords.verify.mockResolvedValue(false);
      await expect(service.login(TEST_REGISTRATION)).rejects.toThrow('Invalid email or password');
      expect(passwords.verify).toHaveBeenCalledWith(
        TEST_REGISTRATION.password,
        unknownUser ? undefined : 'hash',
      );
      expect(repository.create).not.toHaveBeenCalled();
    },
  );
  it('checks the JWT, active registry and current user', async () => {
    expect(await service.authenticate('token')).toEqual({ user, sessionId: 'sid' });
    expect(repository.isActive).toHaveBeenCalledWith('sid', 1);
    repository.isActive.mockResolvedValue(false);
    await expect(service.authenticate('token')).rejects.toThrow(AuthenticationError);
    repository.isActive.mockResolvedValue(true);
    users.findById.mockResolvedValue(undefined);
    await expect(service.authenticate('token')).rejects.toThrow(AuthenticationError);
  });
  it('never reaches the database for missing/oversized/invalid tokens', async () => {
    await expect(service.authenticate(undefined)).rejects.toThrow(AuthenticationError);
    await expect(service.authenticate('x'.repeat(4097))).rejects.toThrow(AuthenticationError);
    tokens.verify.mockRejectedValue(new AuthenticationError());
    await expect(service.authenticate('bad')).rejects.toThrow(AuthenticationError);
    expect(repository.isActive).not.toHaveBeenCalled();
  });
  it('notifies revocation only after a durable logout and supports unsubscribe', async () => {
    const listener = vi.fn();
    const unsubscribe = service.onRevoked(listener);
    repository.revoke.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.logout({ user, sessionId: 'sid' })).rejects.toThrow(
      'database unavailable',
    );
    expect(listener).not.toHaveBeenCalled();
    await service.logout({ user, sessionId: 'sid' });
    expect(repository.revoke).toHaveBeenCalledWith('sid', 1);
    expect(listener).toHaveBeenCalledWith('sid');
    unsubscribe();
    await service.logout({ user, sessionId: 'sid' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
