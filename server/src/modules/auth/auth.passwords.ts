import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

import { RateLimitError } from '../../shared/errors.js';

// scrypt N=2^17, r=8, p=1: 128 MiB per operation. Bound simultaneous work per process.
const COST = { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 };
const KEY_BYTES = 64;
const VERSION = 'scrypt-v1';
const DUMMY = `${VERSION}$${'00'.repeat(16)}$${'00'.repeat(KEY_BYTES)}`;

export const createPasswords = () => {
  let active = 0;
  const derive = async (password: string, salt: Buffer): Promise<Buffer> => {
    if (active >= 2) throw new RateLimitError(1);
    active += 1;
    try {
      return await new Promise<Buffer>((resolve, reject) => {
        scrypt(password, salt, KEY_BYTES, COST, (error, key) => {
          if (error) reject(error);
          else resolve(key);
        });
      });
    } finally {
      active -= 1;
    }
  };

  return {
    async hash(password: string): Promise<string> {
      const salt = randomBytes(16);
      const key = await derive(password, salt);
      return `${VERSION}$${salt.toString('hex')}$${key.toString('hex')}`;
    },
    async verify(password: string, hash: string | undefined): Promise<boolean> {
      const record = hash ?? DUMMY;
      const [version, salt, key] = record.split('$');
      if (
        version !== VERSION ||
        !/^[a-f0-9]{32}$/.test(salt ?? '') ||
        !/^[a-f0-9]{128}$/.test(key ?? '') ||
        record.split('$').length !== 3
      ) {
        throw new Error('Invalid stored password hash');
      }
      const derived = await derive(password, Buffer.from(salt!, 'hex'));
      return timingSafeEqual(derived, Buffer.from(key!, 'hex')) && hash !== undefined;
    },
  };
};

export type Passwords = ReturnType<typeof createPasswords>;
