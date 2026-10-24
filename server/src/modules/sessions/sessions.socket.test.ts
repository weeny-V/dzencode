// Integration test over real sockets: a Socket.io server on a free port and real clients. No database is needed.
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { io as connect, type Socket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { attachRealtime } from '../../realtime.js';
import { SESSIONS_COUNT_EVENT } from './index.js';

const CLIENT_ORIGIN = 'http://localhost:3000';

let httpServer: HttpServer;
let url: string;
let clients: Socket[] = [];

beforeEach(async () => {
  httpServer = createServer();
  attachRealtime(httpServer, { clientOrigin: CLIENT_ORIGIN });
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const client of clients) client.disconnect();
  clients = [];
  // Closes the Socket.io server together with the HTTP server it is attached to.
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

const open = (): Socket => {
  const client = connect(url, { transports: ['websocket'], forceNew: true });
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
  });
});
