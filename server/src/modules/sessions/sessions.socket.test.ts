// Integration test over real sockets: a Socket.io server on a free port and real clients. No database is needed.
import { createServer, request, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { io as connect, type Socket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { attachRealtime } from '../../realtime.js';
import type { AuthContext } from '../auth/index.js';
import { SESSIONS_COUNT_EVENT } from './index.js';

const CLIENT_ORIGIN = 'http://localhost:3000';

let httpServer: HttpServer;
let url: string;
let clients: Socket[] = [];
let revoke: (sessionId: string) => void;
let revoked = false;
const context: AuthContext = {
  sessionId: 'a'.repeat(64),
  user: {
    id: 1,
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    registeredAt: new Date(),
  },
};
const authenticate = vi.fn((token: string | undefined) => {
  if (token !== 'test-token' || revoked)
    return Promise.reject(new Error('Authentication required'));
  return Promise.resolve(context);
});

beforeEach(async () => {
  httpServer = createServer();
  revoked = false;
  authenticate.mockClear();
  attachRealtime(httpServer, {
    clientOrigin: CLIENT_ORIGIN,
    auth: {
      authenticate,
      onRevoked: (listener) => {
        revoke = listener;
        return () => undefined;
      },
    },
  });
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const client of clients) client.disconnect();
  clients = [];
  // Closes the Socket.io server together with the HTTP server it is attached to.
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

const open = (
  headers: Record<string, string> = { Origin: CLIENT_ORIGIN, Cookie: 'dzencode_auth=test-token' },
): Socket => {
  const client = connect(url, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    extraHeaders: headers,
  });
  clients.push(client);
  return client;
};

/** Resolves with the next count the socket receives. Call it BEFORE the event can arrive. */
const nextCount = (client: Socket): Promise<number> =>
  new Promise((resolve) => {
    client.once(SESSIONS_COUNT_EVENT, ({ count }: { count: number }) => resolve(count));
  });

describe('sessions over Socket.io', () => {
  it('tells a new tab how many tabs are open, itself included', async () => {
    const first = open();

    expect(await nextCount(first)).toBe(1);
  });

  it('tells every open tab when another one opens', async () => {
    const first = open();
    await nextCount(first);

    const firstSees = nextCount(first);
    const second = open();
    const secondSees = nextCount(second);

    expect(await firstSees).toBe(2);
    expect(await secondSees).toBe(2);
  });

  it('tells the remaining tabs when one closes', async () => {
    const first = open();
    await nextCount(first);
    // Both tabs hear about the second one opening; wait for that before closing it.
    const firstSeesTwo = nextCount(first);
    const second = open();
    const secondSeesTwo = nextCount(second);
    await Promise.all([firstSeesTwo, secondSeesTwo]);

    const firstSees = nextCount(first);
    second.disconnect();

    expect(await firstSees).toBe(1);
  });

  it('allows the configured client origin for the handshake (CORS)', async () => {
    const res = await fetch(`${url}/socket.io/?EIO=4&transport=polling`, {
      headers: { Origin: CLIENT_ORIGIN },
    });

    expect(res.headers.get('access-control-allow-origin')).toBe(CLIENT_ORIGIN);
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('rejects an untrusted Origin on existing polling sessions and WebSocket upgrades', async () => {
    const opened = await fetch(`${url}/socket.io/?EIO=4&transport=polling`, {
      headers: { Origin: CLIENT_ORIGIN },
    });
    const packet = await opened.text();
    const { sid } = JSON.parse(packet.slice(1)) as { sid: string };
    expect(typeof sid).toBe('string');
    const polling = await fetch(`${url}/socket.io/?EIO=4&transport=polling&sid=${sid}`, {
      headers: { Origin: 'https://evil.example' },
    });
    expect(polling.status).toBe(400);
    const status = await new Promise<number>((resolve, reject) => {
      const req = request(`${url}/socket.io/?EIO=4&transport=websocket&sid=${sid}`, {
        headers: {
          Origin: 'https://evil.example',
          Connection: 'Upgrade',
          Upgrade: 'websocket',
          'Sec-WebSocket-Key': Buffer.alloc(16).toString('base64'),
          'Sec-WebSocket-Version': '13',
        },
      });
      req.on('response', (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      });
      req.on('upgrade', (_res, socket) => {
        socket.destroy();
        reject(new Error('Unexpected WebSocket upgrade'));
      });
      req.on('error', reject);
      req.end();
    });
    expect(status).toBe(400);
  });

  it.each<Record<string, string>>([
    {},
    { Origin: 'https://evil.example', Cookie: 'dzencode_auth=test-token' },
    { Origin: CLIENT_ORIGIN },
    { Origin: CLIENT_ORIGIN, Cookie: 'dzencode_auth=invalid' },
  ])('rejects unauthenticated or untrusted WebSocket handshakes: %j', async (headers) => {
    const socket = open(headers);
    await new Promise<void>((resolve) => socket.once('connect_error', () => resolve()));
    expect(socket.connected).toBe(false);
  });

  it('disconnects all tabs of a revoked session and denies reconnect', async () => {
    const first = open();
    await nextCount(first);
    const seesTwo = nextCount(first);
    const second = open();
    await Promise.all([seesTwo, nextCount(second)]);
    const closed = [first, second].map(
      (socket) => new Promise<void>((resolve) => socket.once('disconnect', () => resolve())),
    );
    revoked = true;
    revoke(context.sessionId);
    await Promise.all(closed);
    const third = open();
    await new Promise<void>((resolve) => third.once('connect_error', () => resolve()));
    expect(third.connected).toBe(false);
  });

  it('rechecks the session after joining its revocation room', async () => {
    authenticate.mockImplementationOnce(() => Promise.resolve(context));
    authenticate.mockImplementationOnce(() => Promise.reject(new Error('Revoked while joining')));
    const socket = open();
    const counts: number[] = [];
    socket.on(SESSIONS_COUNT_EVENT, ({ count }: { count: number }) => counts.push(count));
    await new Promise<void>((resolve) => socket.once('disconnect', () => resolve()));
    expect(counts).toEqual([]);
  });
});
