import { describe, expect, it } from 'vitest';

import { RateLimitError } from '../../shared/errors.js';
import { createPasswords } from './auth.passwords.js';

describe('password hashing', () => {
  it('uses a fresh salt, verifies exactly and rejects unknown users', async () => {
    const passwords = createPasswords();
    const first = await passwords.hash(' password 😀 123 ');
    const second = await passwords.hash(' password 😀 123 ');
    expect(first).not.toBe(second);
    expect(first).not.toContain('password');
    expect(await passwords.verify(' password 😀 123 ', first)).toBe(true);
    expect(await passwords.verify('password 😀 123', first)).toBe(false);
    expect(await passwords.verify(' password 😀 123 ', undefined)).toBe(false);
  });
  it('bounds expensive concurrent KDFs and releases capacity afterwards', async () => {
    const passwords = createPasswords();
    const first = passwords.hash('first');
    const second = passwords.hash('second');
    await expect(passwords.hash('third')).rejects.toThrow(RateLimitError);
    await Promise.all([first, second]);
    expect(await passwords.hash('after')).toMatch(/^scrypt-v1\$/);
  });
  it('fails deliberately for a corrupt stored hash', async () => {
    await expect(createPasswords().verify('x', 'scrypt-v1$broken')).rejects.toThrow(
      'Invalid stored password hash',
    );
  });
});
