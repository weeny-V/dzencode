import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createTokens } from './modules/auth/auth.tokens.js';
import { createPool, type Pool } from './shared/db/pool.js';
import { TEST_JWT_SECRET } from './shared/testing/auth.js';

// The pool connects lazily, so these tests run without a database.
const pool = createPool(loadConfig().db);
const { app } = createApp({
  clientOrigin: 'http://localhost:3000',
  pool,
  jwtSecret: TEST_JWT_SECRET,
});

afterAll(async () => {
  await pool.end();
});

describe('GET /health', () => {
  it('reports the service is up', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect((res.body as { status: string }).status).toBe('ok');
  });

  it('allows the configured client origin (CORS)', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:3000');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});

describe('unknown routes', () => {
  it('return a JSON 404', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});

describe('server and framework errors', () => {
  it('answers 500 without leaking details and logs the cause', async () => {
    const failingPool = {
      query: () => Promise.reject(new Error('secret connection string')),
    } as unknown as Pool;
    const { app: failingApp } = createApp({
      clientOrigin: 'http://localhost:3000',
      pool: failingPool,
      jwtSecret: TEST_JWT_SECRET,
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const token = await createTokens(TEST_JWT_SECRET).sign(1, 'a'.repeat(64));
    const res = await request(failingApp).get('/orders').auth(token, { type: 'bearer' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(JSON.stringify(res.body)).not.toContain('secret');
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });

  it('answers 413 for a body over the 100 kB limit instead of 500', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ title: 'x', description: 'a'.repeat(200_000) });

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: 'request entity too large' });
  });
});

describe('request validation', () => {
  it('rejects a malformed JSON body', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Content-Type', 'application/json')
      .send('{"title":');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid JSON body' });
  });

  it('checks authentication before inventory input or database access', async () => {
    const res = await request(app).delete('/orders/abc');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication required' });
  });
});

describe('inventory authentication', () => {
  it.each(['/orders', '/orders/1', '/products', '/product-types', '/users', '/auth/me'])(
    'denies a guest at %s, including a previously requested endpoint',
    async (path) => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const res = await request(app).get(path);
        expect(res.status).toBe(401);
        expect(res.headers['cache-control']).toBe('no-store');
      }
    },
  );
  it.each(['/orders', '/products'])('denies guest writes at %s', async (path) => {
    expect((await request(app).post(path).send({})).status).toBe(401);
    expect((await request(app).delete(`${path}/1`)).status).toBe(401);
  });
  it('does not accept browser cookies as REST authorization', async () => {
    const token = await createTokens(TEST_JWT_SECRET).sign(1, 'a'.repeat(64));
    const res = await request(app).get('/orders').set('Cookie', `dzencode_auth=${token}`);
    expect(res.status).toBe(401);
  });
});
