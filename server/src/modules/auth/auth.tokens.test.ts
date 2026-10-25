import { decodeJwt, SignJWT } from 'jose';
import { describe, expect, it, vi } from 'vitest';

import { AuthenticationError } from '../../shared/errors.js';
import { TEST_JWT_SECRET } from '../../shared/testing/auth.js';
import { createTokens } from './auth.tokens.js';

const tokens = createTokens(TEST_JWT_SECRET);
const sid = 'a'.repeat(64);

describe('JWT', () => {
  it('identifies the user and session and deliberately has no expiry', async () => {
    const token = await tokens.sign(42, sid);
    expect(decodeJwt(token)).toMatchObject({
      sub: '42',
      sid,
      iss: 'dzencode-api',
      aud: 'dzencode-inventory',
    });
    expect(decodeJwt(token)).not.toHaveProperty('exp');
    const time = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(time + 10 * 365 * 24 * 60 * 60 * 1000);
    try {
      expect(await tokens.verify(token)).toEqual({ userId: 42, sessionId: sid });
    } finally {
      clock.mockRestore();
    }
  });
  it('rejects tampering, another key and malformed tokens', async () => {
    const token = await tokens.sign(1, sid);
    const [header, payload, signature] = token.split('.');
    for (const bad of [
      '',
      'not.jwt',
      `${header}.${payload}.${signature?.startsWith('a') ? 'b' : 'a'}${signature?.slice(1)}`,
      await createTokens('different-secret-at-least-32-bytes').sign(1, sid),
    ]) {
      await expect(tokens.verify(bad)).rejects.toThrow(AuthenticationError);
    }
  });
  it.each([
    { sub: '0', sid },
    { sub: '2147483648', sid },
    { sub: '01', sid },
    { sub: '1', sid: 'invalid' },
    { sub: '1' },
  ])('rejects invalid signed claims %j', async (claims) => {
    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer('dzencode-api')
      .setAudience('dzencode-inventory')
      .setIssuedAt()
      .sign(new TextEncoder().encode(TEST_JWT_SECRET));
    await expect(tokens.verify(token)).rejects.toThrow(AuthenticationError);
  });
  it('requires a strong configured key', () => {
    expect(() => createTokens('')).toThrow('AUTH_JWT_SECRET');
    expect(() => createTokens('too-short')).toThrow('AUTH_JWT_SECRET');
  });
});
