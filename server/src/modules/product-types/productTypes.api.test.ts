// Integration tests: HTTP -> service -> repository -> real MySQL test database (see shared/testing/database.ts).
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, resetData } from '../../shared/testing/database.js';

const { app, pool } = createTestContext();

beforeEach(() => resetData(pool));

afterAll(async () => {
  await pool.end();
});

describe('GET /product-types', () => {
  it('lists the types sorted by name', async () => {
    const res = await request(app).get('/product-types');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 2, name: 'Laptops' },
      { id: 1, name: 'Monitors' },
    ]);
  });
});
