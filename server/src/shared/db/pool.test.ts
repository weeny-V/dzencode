import { createPool as createMysqlPool } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';

import { createPool } from './pool.js';

vi.mock('mysql2/promise', () => ({ createPool: vi.fn() }));

describe('database transport', () => {
  it('verifies both the CA and server hostname when TLS is enabled', () => {
    createPool({
      host: 'db.example',
      port: 25060,
      user: 'app',
      password: 'test',
      database: 'inventory',
      tls: { ca: 'test CA' },
    });
    expect(createMysqlPool).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ssl: { ca: 'test CA', rejectUnauthorized: true, verifyIdentity: true },
      }),
    );
  });
  it('preserves the local non-TLS transport when TLS is not configured', () => {
    createPool({
      host: 'localhost',
      port: 3306,
      user: 'app',
      password: 'test',
      database: 'inventory',
    });
    const [options] = vi.mocked(createMysqlPool).mock.lastCall!;
    expect(options).not.toHaveProperty('ssl');
  });
});
