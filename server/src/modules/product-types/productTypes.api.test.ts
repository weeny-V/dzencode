// Integration tests: HTTP -> service -> repository -> real MySQL test database (see shared/testing/database.ts).
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestClient } from '../../shared/testing/auth.js';
import { createTestContext, resetData } from '../../shared/testing/database.js';

const { app, pool, auth } = createTestContext();
const { client, register } = createTestClient(app, auth);

beforeEach(async () => {
  await resetData(pool);
  await register();
});

afterAll(async () => {
  await pool.end();
});

describe('GET /product-types', () => {
  it('lists the types sorted by name', async () => {
    const res = await client.get('/product-types');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 2, name: 'Laptops' },
      { id: 1, name: 'Monitors' },
    ]);
  });
});
