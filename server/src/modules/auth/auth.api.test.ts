import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { decodeJwt } from 'jose';
import { io as connect, type Socket } from 'socket.io-client';
import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { attachRealtime } from '../../realtime.js';
import { withTransaction } from '../../shared/db/transaction.js';
import { TEST_JWT_SECRET, TEST_REGISTRATION } from '../../shared/testing/auth.js';
import { count, createTestContext, resetData } from '../../shared/testing/database.js';
import { SESSIONS_COUNT_EVENT } from '../sessions/index.js';
import { createUsersModule, type User } from '../users/index.js';
import { createPasswords } from './auth.passwords.js';
import { createAuthRepository } from './auth.repository.js';
import { createAuthService } from './auth.service.js';
import { createTokens } from './auth.tokens.js';

const { pool } = createTestContext();
let context: ReturnType<typeof createApp>;
let httpServer: HttpServer | undefined;
const clients: Socket[] = [];
type AuthResponse = { user: User; token: string };
const origin = 'http://localhost:3000';

beforeEach(async () => {
  await resetData(pool);
  context = createApp({ clientOrigin: origin, jwtSecret: TEST_JWT_SECRET, pool });
});
afterEach(async () => {
  for (const client of clients) client.disconnect();
  clients.length = 0;
  if (httpServer) {
    await new Promise<void>((resolve) => httpServer!.close(() => resolve()));
    httpServer = undefined;
  }
});
afterAll(async () => {
  await pool.end();
});

const register = async (email = TEST_REGISTRATION.email): Promise<AuthResponse> => {
  const res = await request(context.app)
    .post('/auth/register')
    .send({ ...TEST_REGISTRATION, email });
  expect(res.status).toBe(201);
  expect(res.headers['cache-control']).toBe('no-store');
  return res.body as AuthResponse;
};

describe('authentication REST and persistent sessions', () => {
  it('registers, normalizes email, automatically logs in and never returns a password hash', async () => {
    const { user, token } = await register(' Test@EXAMPLE.com ');
    expect(user.email).toBe('test@example.com');
    expect(user).not.toHaveProperty('passwordHash');
    const me = await request(context.app).get('/auth/me').auth(token, { type: 'bearer' });
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ user, sessionId: decodeJwt(token).sid });
    expect(me.headers['cache-control']).toBe('no-store');
    expect(await count(pool, 'users')).toBe(1);
    expect(await count(pool, 'auth_sessions')).toBe(1);
    const stored = await createUsersModule({ pool }).service.findCredentials('test@example.com');
    expect(stored?.passwordHash).toMatch(/^scrypt-v1\$/);
    expect(stored?.passwordHash).not.toContain(TEST_REGISTRATION.password);
  });
  it('rolls back the user when creating the registration session fails', async () => {
    const service = createAuthService({
      repository: {
        ...createAuthRepository(pool),
        create: () => Promise.reject(new Error('Session insert failed')),
      },
      users: createUsersModule({ pool }).service,
      passwords: createPasswords(),
      tokens: createTokens(TEST_JWT_SECRET),
      transaction: (work) => withTransaction(pool, work),
    });
    await expect(service.register(TEST_REGISTRATION)).rejects.toThrow('Session insert failed');
    expect(await count(pool, 'users')).toBe(0);
    expect(await count(pool, 'auth_sessions')).toBe(0);
    await register();
  });
  it('enforces normalized unique email, including concurrent registration', async () => {
    const attempts = await Promise.all(
      ['Test@example.com', ' test@EXAMPLE.com '].map((email) =>
        request(context.app)
          .post('/auth/register')
          .send({ ...TEST_REGISTRATION, email }),
      ),
    );
    expect(attempts.map((res) => res.status).sort()).toEqual([201, 409]);
    expect(attempts.find((res) => res.status === 409)?.body).toEqual({
      error: 'Email is already registered',
    });
    expect(await count(pool, 'users')).toBe(1);
    expect(await count(pool, 'auth_sessions')).toBe(1);
  });
  it('rejects a mismatched confirmation before writing either table', async () => {
    const res = await request(context.app)
      .post('/auth/register')
      .send({ ...TEST_REGISTRATION, passwordConfirmation: 'wrong' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'password confirmation must match' });
    expect(await count(pool, 'users')).toBe(0);
    expect(await count(pool, 'auth_sessions')).toBe(0);
  });
  it('uses the same invalid-credentials response for unknown email and wrong password', async () => {
    await register();
    for (const input of [
      { email: TEST_REGISTRATION.email, password: 'wrong' },
      { email: 'unknown@example.com', password: TEST_REGISTRATION.password },
    ]) {
      const res = await request(context.app).post('/auth/login').send(input);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid email or password' });
      expect(res.headers['cache-control']).toBe('no-store');
    }
    expect(await count(pool, 'auth_sessions')).toBe(1);
  });
  it('revokes only the current session, survives an API restart and protects previously read inventory', async () => {
    const first = await register();
    const login = await request(context.app)
      .post('/auth/login')
      .send({ email: 'TEST@example.com', password: TEST_REGISTRATION.password });
    expect(login.status).toBe(200);
    const second = login.body as AuthResponse;
    const other = await register('other@example.com');
    for (const token of [first.token, second.token, other.token]) {
      expect(
        (await request(context.app).get('/orders').auth(token, { type: 'bearer' })).status,
      ).toBe(200);
    }
    expect(
      (await request(context.app).post('/auth/logout').auth(first.token, { type: 'bearer' }))
        .status,
    ).toBe(204);
    context = createApp({ clientOrigin: origin, jwtSecret: TEST_JWT_SECRET, pool });
    for (const path of ['/auth/me', '/orders', '/products', '/product-types', '/users']) {
      expect(
        (await request(context.app).get(path).auth(first.token, { type: 'bearer' })).status,
      ).toBe(401);
      expect((await request(context.app).get(path)).status).toBe(401);
    }
    expect(
      (
        await request(context.app)
          .post('/orders')
          .auth(first.token, { type: 'bearer' })
          .send({ title: 'Denied' })
      ).status,
    ).toBe(401);
    expect(
      (await request(context.app).delete('/products/1').auth(first.token, { type: 'bearer' }))
        .status,
    ).toBe(401);
    expect(await count(pool, 'orders')).toBe(3);
    expect(await count(pool, 'products')).toBe(3);
    for (const token of [second.token, other.token]) {
      expect(
        (await request(context.app).get('/auth/me').auth(token, { type: 'bearer' })).status,
      ).toBe(200);
    }
  });
  it('allows all authenticated users to change the same inventory', async () => {
    const first = await register();
    const second = await register('second@example.com');
    const created = await request(context.app)
      .post('/orders')
      .auth(first.token, { type: 'bearer' })
      .send({ title: 'Shared' });
    expect(created.status).toBe(201);
    const path = `/orders/${(created.body as { id: number }).id}`;
    expect(
      (await request(context.app).get(path).auth(second.token, { type: 'bearer' })).status,
    ).toBe(200);
    expect(
      (await request(context.app).delete(path).auth(second.token, { type: 'bearer' })).status,
    ).toBe(204);
  });
  it('returns only participant fields and exposes email only in the current-user response', async () => {
    const first = await register();
    await register('second@example.com');
    const res = await request(context.app).get('/users').auth(first.token, { type: 'bearer' });
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    const participants = res.body as Record<string, unknown>[];
    expect(participants).toHaveLength(2);
    for (const participant of participants)
      expect(Object.keys(participant).sort()).toEqual([
        'firstName',
        'id',
        'lastName',
        'registeredAt',
      ]);
  });
  it('rejects signed unknown sessions, wrong user/session pairs and tampered JWTs', async () => {
    const { token, user } = await register();
    const tokens = createTokens(TEST_JWT_SECRET);
    const sid = decodeJwt(token).sid as string;
    for (const invalid of [
      await tokens.sign(user.id, 'b'.repeat(64)),
      await tokens.sign(user.id + 1, sid),
      `${token.slice(0, -10)}tampered`,
    ]) {
      const res = await request(context.app).get('/auth/me').auth(invalid, { type: 'bearer' });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Authentication required' });
    }
  });
  it('throttles malformed attempts before hashing and does not trust X-Forwarded-For', async () => {
    for (const [route, limit] of [
      ['login', 20],
      ['register', 10],
    ] as const) {
      for (let n = 0; n < limit; n += 1)
        expect((await request(context.app).post(`/auth/${route}`).send({})).status).toBe(400);
      const res = await request(context.app)
        .post(`/auth/${route}`)
        .set('X-Forwarded-For', '1.2.3.4')
        .send({});
      expect(res.status).toBe(429);
      expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
      expect(res.body).toEqual({ error: 'Too many attempts. Try again later.' });
    }
  });
  it('disconnects sockets on real HTTP logout, keeps other sessions and rejects revoked reconnect', async () => {
    const first = await register();
    const second = await register('second@example.com');
    httpServer = createServer(context.app);
    attachRealtime(httpServer, {
      clientOrigin: origin,
      auth: context.auth,
      events: context.events,
    });
    await new Promise<void>((resolve) => httpServer!.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
    const open = (token: string) => {
      const socket = connect(url, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
        extraHeaders: { Origin: origin, Cookie: `dzencode_auth=${token}` },
      });
      clients.push(socket);
      return socket;
    };
    const nextCount = (socket: Socket) =>
      new Promise<number>((resolve) =>
        socket.once(SESSIONS_COUNT_EVENT, ({ count }: { count: number }) => resolve(count)),
      );
    const one = open(first.token);
    expect(await nextCount(one)).toBe(1);
    const two = open(first.token);
    expect(await nextCount(two)).toBe(2);
    const other = open(second.token);
    expect(await nextCount(other)).toBe(3);
    const closed = [one, two].map(
      (socket) => new Promise<void>((resolve) => socket.once('disconnect', () => resolve())),
    );
    const countAfter = new Promise<number>((resolve) => {
      const receive = ({ count }: { count: number }) => {
        if (count !== 1) return;
        other.off(SESSIONS_COUNT_EVENT, receive);
        resolve(count);
      };
      other.on(SESSIONS_COUNT_EVENT, receive);
    });
    expect(
      (await request(context.app).post('/auth/logout').auth(first.token, { type: 'bearer' }))
        .status,
    ).toBe(204);
    await Promise.all(closed);
    expect(await countAfter).toBe(1);
    expect(other.connected).toBe(true);
    const reconnect = open(first.token);
    await new Promise<void>((resolve) => reconnect.once('connect_error', () => resolve()));
    expect(reconnect.connected).toBe(false);
    expect(
      await createAuthRepository(pool).isActive(
        decodeJwt(first.token).sid as string,
        first.user.id,
      ),
    ).toBe(false);
  });
});
