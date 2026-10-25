import type { Pool } from '../../shared/db/pool.js';
import { createUsersRepository } from './users.repository.js';
import { createUsersRouter } from './users.routes.js';
import { createUsersService } from './users.service.js';

export const createUsersModule = ({ pool }: { pool: Pool }) => {
  const service = createUsersService({ repository: createUsersRepository(pool) });
  return { service, router: createUsersRouter(service) };
};

export type { UsersService } from './users.service.js';
export type { Participant, User, UserCredentials } from './users.types.js';
