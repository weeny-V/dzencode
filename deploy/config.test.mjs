import assert from 'node:assert/strict';
import { test } from 'node:test';

import { deploymentConfig } from './config.mjs';

test('uses the platform origin and preserves a non-default public port', () => {
  assert.deepEqual(
    deploymentConfig({ RENDER_EXTERNAL_URL: 'https://demo.onrender.com', PORT: '12000' }),
    {
      origin: 'https://demo.onrender.com',
      port: 12000,
    },
  );
});
test('allows local proxy verification and rejects unsafe origins or colliding listeners', () => {
  assert.equal(deploymentConfig({ PUBLIC_ORIGIN: 'http://localhost:3074' }).port, 10000);
  for (const value of [
    'http://public.example',
    'https://demo.example/path',
    'https://user:pass@demo.example',
    'https://demo.example/',
  ]) {
    assert.throws(() => deploymentConfig({ PUBLIC_ORIGIN: value }));
  }
  for (const value of ['3000', '4000', '80', 'NaN', '70000']) {
    assert.throws(() => deploymentConfig({ PUBLIC_ORIGIN: 'https://demo.example', PORT: value }));
  }
});
