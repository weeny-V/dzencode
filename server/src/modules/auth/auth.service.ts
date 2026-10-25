import { randomBytes } from 'node:crypto';

import type { Transaction } from '../../shared/db/executor.js';
import { AuthenticationError } from '../../shared/errors.js';
import type { User, UsersService } from '../users/index.js';
import type { Passwords } from './auth.passwords.js';
import type { AuthRepository } from './auth.repository.js';
import type { LoginInput, RegistrationInput } from './auth.schemas.js';
import type { Tokens } from './auth.tokens.js';

export interface AuthContext {
  user: User;
  sessionId: string;
}

interface AuthDeps {
  repository: AuthRepository;
  users: Pick<UsersService, 'create' | 'findCredentials' | 'findById'>;
  passwords: Passwords;
  tokens: Tokens;
  transaction: Transaction;
}

export const createAuthService = ({
  repository,
  users,
  passwords,
  tokens,
  transaction,
}: AuthDeps) => {
  const revocationListeners = new Set<(sessionId: string) => void>();
  return {
    async register(input: RegistrationInput) {
      const passwordHash = await passwords.hash(input.password);
      return await transaction(async (executor) => {
        const user = await users.create(
          {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            passwordHash,
          },
          executor,
        );
        const sessionId = randomBytes(32).toString('hex');
        const token = await tokens.sign(user.id, sessionId);
        await repository.create(sessionId, user.id, executor);
        return { user, token };
      });
    },
    async login(input: LoginInput) {
      const credentials = await users.findCredentials(input.email);
      // Unknown emails still perform the same expensive KDF, avoiding a cheap enumeration path.
      const valid = await passwords.verify(input.password, credentials?.passwordHash);
      if (!credentials || !valid) throw new AuthenticationError('Invalid email or password');
      const { passwordHash: _passwordHash, ...user } = credentials;
      const sessionId = randomBytes(32).toString('hex');
      const token = await tokens.sign(user.id, sessionId);
      await repository.create(sessionId, user.id);
      return { user, token };
    },
    async authenticate(token: string | undefined): Promise<AuthContext> {
      if (!token || token.length > 4096) throw new AuthenticationError();
      const { sessionId, userId } = await tokens.verify(token);
      if (!(await repository.isActive(sessionId, userId))) throw new AuthenticationError();
      const user = await users.findById(userId);
      if (!user) throw new AuthenticationError();
      return { user, sessionId };
    },
    async logout({ user, sessionId }: AuthContext): Promise<void> {
      await repository.revoke(sessionId, user.id);
      for (const listener of revocationListeners) listener(sessionId);
    },
    onRevoked(listener: (sessionId: string) => void): () => void {
      revocationListeners.add(listener);
      return () => {
        revocationListeners.delete(listener);
      };
    },
  };
};

export type AuthService = ReturnType<typeof createAuthService>;
