import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('requires a CA for external TLS and decodes PEM line separators', () => {
    expect(() => loadConfig({ DB_SSL: 'true' })).toThrow('DB_SSL_CA');
    expect(() => loadConfig({ DB_SSL: 'yes' })).toThrow('DB_SSL must be true or false');
    expect(loadConfig({ DB_SSL: 'true', DB_SSL_CA: 'certificate\\nline' }).db.tls).toEqual({
      ca: 'certificate\nline',
    });
    expect(loadConfig({ DB_SSL: 'false' }).db.tls).toBeUndefined();
  });
  it('falls back to defaults', () => {
    expect(loadConfig({})).toEqual({
      host: '0.0.0.0',
      port: 4000,
      clientOrigin: 'http://localhost:3000',
      jwtSecret: '',
      db: {
        host: 'localhost',
        port: 3306,
        user: 'dzencode',
        password: 'dzencode',
        database: 'dzencode',
      },
    });
  });

  it('reads values from the environment', () => {
    const config = loadConfig({
      HOST: '127.0.0.1',
      PORT: '5050',
      CLIENT_ORIGIN: 'https://app.test',
      AUTH_JWT_SECRET: 'configured-secret',
      DB_HOST: 'db',
      DB_PORT: '3307',
      DB_USER: 'app',
      DB_PASSWORD: 'secret',
      DB_NAME: 'inventory',
    });
    expect(config).toEqual({
      host: '127.0.0.1',
      port: 5050,
      clientOrigin: 'https://app.test',
      jwtSecret: 'configured-secret',
      db: { host: 'db', port: 3307, user: 'app', password: 'secret', database: 'inventory' },
    });
  });
});
