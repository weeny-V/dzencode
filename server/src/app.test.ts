import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createPool, type Pool } from './shared/db/pool.js';

// The pool connects lazily, so these tests run without a database.
const pool = createPool(loadConfig().db);
const app = createApp({ clientOrigin: 'http://localhost:3000', pool });

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
    const failingApp = createApp({ clientOrigin: 'http://localhost:3000', pool: failingPool });
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await request(failingApp).get('/orders');

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

  it('rejects a non-numeric id before touching the database', async () => {
    const res = await request(app).delete('/orders/abc');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'id must be a positive integer' });
  });
});
