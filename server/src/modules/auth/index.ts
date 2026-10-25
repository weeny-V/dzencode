import type { Transaction } from '../../shared/db/executor.js';
import type { Pool } from '../../shared/db/pool.js';
import type { UsersService } from '../users/index.js';
import { createPasswords } from './auth.passwords.js';
import { createAuthRepository } from './auth.repository.js';
import { createAuthRouter, requireAuthentication } from './auth.routes.js';
import { createAuthService } from './auth.service.js';
import { createTokens } from './auth.tokens.js';

export const createAuthModule = ({
  pool,
  users,
  jwtSecret,
  transaction,
}: {
  pool: Pool;
  users: UsersService;
  jwtSecret: string;
  transaction: Transaction;
}) => {
  const service = createAuthService({
    repository: createAuthRepository(pool),
    users,
    passwords: createPasswords(),
    tokens: createTokens(jwtSecret),
    transaction,
  });
  return {
    service,
    router: createAuthRouter(service),
    requireAuthentication: requireAuthentication(service),
  };
};

export { AUTH_COOKIE_NAME, readAuthCookie } from './auth.cookies.js';
export type { AuthContext, AuthService } from './auth.service.js';
