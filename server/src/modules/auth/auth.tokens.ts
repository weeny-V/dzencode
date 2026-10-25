import { jwtVerify, SignJWT } from 'jose';

import { AuthenticationError } from '../../shared/errors.js';
import { MAX_INT } from '../../shared/validation.js';

const ISSUER = 'dzencode-api';
const AUDIENCE = 'dzencode-inventory';

export const createTokens = (secret: string) => {
  if (Buffer.byteLength(secret) < 32)
    throw new Error('AUTH_JWT_SECRET must contain at least 32 bytes');
  const key = new TextEncoder().encode(secret);
  return {
    sign: (userId: number, sessionId: string): Promise<string> =>
      new SignJWT({ sid: sessionId })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setSubject(String(userId))
        .setIssuedAt()
        .sign(key),
    async verify(token: string): Promise<{ userId: number; sessionId: string }> {
      try {
        const { payload } = await jwtVerify(token, key, {
          algorithms: ['HS256'],
          issuer: ISSUER,
          audience: AUDIENCE,
          typ: 'JWT',
          requiredClaims: ['sub', 'sid', 'iat'],
        });
        const userId = Number(payload.sub);
        if (
          !/^[1-9]\d*$/.test(payload.sub ?? '') ||
          !Number.isSafeInteger(userId) ||
          userId > MAX_INT ||
          typeof payload.sid !== 'string' ||
          !/^[a-f0-9]{64}$/.test(payload.sid) ||
          typeof payload.iat !== 'number' ||
          !Number.isInteger(payload.iat) ||
          payload.iat > Math.floor(Date.now() / 1000) + 60
        ) {
          throw new AuthenticationError();
        }
        return { userId, sessionId: payload.sid };
      } catch {
        throw new AuthenticationError();
      }
    },
  };
};

export type Tokens = ReturnType<typeof createTokens>;
