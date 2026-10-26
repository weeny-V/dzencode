import assert from 'node:assert/strict';
import { test } from 'node:test';

import { verifyStack } from './stack.mjs';

test('system verification migrates before checks, separates schemas and tears down last', async () => {
  const calls = [];
  await verifyStack(
    'system',
    async (...args) => {
      calls.push(args);
    },
    'dzencode-tests-123',
    '/repo',
  );
  assert.deepEqual(
    calls.map(([name]) => name),
    ['docker', 'docker', 'npm', 'docker', 'playwright', 'docker'],
  );
  assert.equal(calls[2][2].DB_NAME, 'dzencode_e2e');
  assert.equal(calls[4][2].E2E_MANAGED_STACK, 'dzencode-tests-123');
  assert.ok(calls.at(-1)[1].includes('--volumes'));
});

for (const failAt of [0, 1, 2, 3, 4]) {
  test(`failure at step ${failAt} still collects logs and releases the owned project`, async () => {
    const calls = [];
    await assert.rejects(
      verifyStack(
        'system',
        async (command, args) => {
          calls.push([command, args]);
          if (calls.length - 1 === failAt) throw new Error('Controlled failure');
        },
        'dzencode-tests-123',
        '/repo',
      ),
      /Controlled failure/,
    );
    assert.ok(calls.at(-2)[1].includes('logs'));
    assert.ok(calls.at(-1)[1].includes('down'));
    for (const [command, args] of calls) {
      if (command === 'docker') assert.equal(args[2], 'dzencode-tests-123');
    }
  });
}

test('integration mode never starts the application or a browser', async () => {
  const calls = [];
  await verifyStack(
    'integration',
    async (...args) => {
      calls.push(args);
    },
    'dzencode-tests-123',
    '/repo',
  );
  assert.equal(
    calls.some(([command]) => command === 'playwright'),
    false,
  );
  assert.equal(
    calls.some(([, args]) => args.includes('client')),
    false,
  );
});

test('invalid mode or project cannot mutate Docker', async () => {
  const run = () => assert.fail('Must not execute');
  await assert.rejects(verifyStack('other', run, 'dzencode-tests-123', '/repo'));
  await assert.rejects(verifyStack('system', run, 'dzencode6d', '/repo'));
});
