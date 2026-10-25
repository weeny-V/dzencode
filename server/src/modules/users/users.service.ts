import { DuplicateKeyError } from '../../shared/db/errors.js';
import type { DbExecutor } from '../../shared/db/executor.js';
import { ConflictError } from '../../shared/errors.js';
import type { UsersRepository } from './users.repository.js';
import type { NewUser } from './users.types.js';

export const createUsersService = ({ repository }: { repository: UsersRepository }) => ({
  async create(input: NewUser, executor: DbExecutor) {
    try {
      return await repository.create(input, executor);
    } catch (error) {
      if (error instanceof DuplicateKeyError)
        throw new ConflictError('Email is already registered');
      throw error;
    }
  },
  findCredentials: (email: string) => repository.findCredentials(email),
  findById: (id: number) => repository.findById(id),
  list: () => repository.list(),
});

export type UsersService = ReturnType<typeof createUsersService>;
