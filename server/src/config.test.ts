import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('falls back to defaults', () => {
    expect(loadConfig({})).toEqual({
      host: '0.0.0.0',
      port: 4000,
      clientOrigin: 'http://localhost:3000',
    });
  });

  it('reads values from the environment', () => {
    const config = loadConfig({
      HOST: '127.0.0.1',
      PORT: '5050',
      CLIENT_ORIGIN: 'https://app.test',
    });
    expect(config).toEqual({ host: '127.0.0.1', port: 5050, clientOrigin: 'https://app.test' });
  });
});
