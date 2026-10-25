import { describe, expect, it, vi } from 'vitest';

import { DuplicateKeyError } from '../../shared/db/errors.js';
import type { DbExecutor } from '../../shared/db/executor.js';
import { ConflictError } from '../../shared/errors.js';
import { createUsersService } from './users.service.js';

describe('users service', () => {
  it('translates unique email conflicts while preserving infrastructure errors', async () => {
    const repository = {
      create: vi.fn(),
      findCredentials: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
    };
    const service = createUsersService({ repository });
    const input = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      passwordHash: 'hash',
    };
    repository.create.mockRejectedValueOnce(new DuplicateKeyError());
    await expect(service.create(input, {} as DbExecutor)).rejects.toThrow(ConflictError);
    repository.create.mockRejectedValueOnce(new Error('offline'));
    await expect(service.create(input, {} as DbExecutor)).rejects.toThrow('offline');
  });
});
