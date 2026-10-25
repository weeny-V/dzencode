import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { io as connect, type Socket } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';

import { attachRealtime } from '../../realtime.js';
import { TEST_JWT_SECRET } from '../../shared/testing/auth.js';
import { SESSIONS_COUNT_EVENT } from '../sessions/index.js';
import type { User } from '../users/index.js';
import { createPasswords } from './auth.passwords.js';
import { createAuthService } from './auth.service.js';
import { createTokens } from './auth.tokens.js';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

const origin = 'http://localhost:3000';
const firstSession = 'a'.repeat(64);
const otherSession = 'b'.repeat(64);
const user: User = {
  id: 1,
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  registeredAt: new Date('2026-01-01T00:00:00Z'),
};
let cleanup: (() => Promise<void>) | undefined;

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined;
});

describe('counter broadcasts during authentication', () => {
  it.each([false, true])(
    'excludes pending sockets, including logout before joining: %s',
    async (logout) => {
      const firstUserReached = deferred<void>();
      const firstUser = deferred<User>();
      const repeatedCheckReached = deferred<void>();
      const repeatedCheck = deferred<boolean>();
      const active = new Set([firstSession, otherSession]);
      let firstUserRead = true;
      let firstSessionChecks = 0;
      const tokens = createTokens(TEST_JWT_SECRET);
      const auth = createAuthService({
        tokens,
        passwords: createPasswords(),
        transaction: () => Promise.reject(new Error('Unexpected transaction')),
        repository: {
          create: () => Promise.reject(new Error('Unexpected session insert')),
          revoke: (sessionId) => {
            active.delete(sessionId);
            return Promise.resolve();
          },
          isActive: (sessionId) => {
            if (sessionId === firstSession && ++firstSessionChecks === 2) {
              repeatedCheckReached.resolve();
              return repeatedCheck.promise;
            }
            return Promise.resolve(active.has(sessionId));
          },
        },
        users: {
          create: () => Promise.reject(new Error('Unexpected registration')),
          findCredentials: () => Promise.reject(new Error('Unexpected login')),
          findById: (id) => {
            if (id === user.id && firstUserRead) {
              firstUserRead = false;
              firstUserReached.resolve();
              return firstUser.promise;
            }
            return Promise.resolve({ ...user, id });
          },
        },
      });
      const httpServer = createServer();
      const io = attachRealtime(httpServer, { clientOrigin: origin, auth });
      const clients: Socket[] = [];
      cleanup = async () => {
        firstUser.resolve(user);
        repeatedCheck.resolve(false);
        for (const socket of clients) socket.disconnect();
        await io.close();
      };
      await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
      const url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
      const open = (token: string) => {
        const socket = connect(url, {
          forceNew: true,
          transports: ['websocket'],
          reconnection: false,
          extraHeaders: { Origin: origin, Cookie: `dzencode_auth=${token}` },
        });
        clients.push(socket);
        return socket;
      };
      const count = (socket: Socket) =>
        new Promise<number>((resolve) => {
          socket.once(SESSIONS_COUNT_EVENT, ({ count }: { count: number }) => resolve(count));
        });
      const pending = open(await tokens.sign(user.id, firstSession));
      const counts: number[] = [];
      pending.on(SESSIONS_COUNT_EVENT, ({ count }: { count: number }) => counts.push(count));
      const connected = new Promise<void>((resolve) => pending.once('connect', () => resolve()));
      await firstUserReached.promise;
      // The initial DB read saw an active session, but logout can commit before the socket joins its room.
      if (logout) await auth.logout({ user, sessionId: firstSession });
      firstUser.resolve(user);
      await Promise.all([connected, repeatedCheckReached.promise]);

      const other = open(await tokens.sign(2, otherSession));
      expect(await count(other)).toBe(1);
      // A packet on the same transport creates a deterministic delivery barrier after the broadcast.
      const barrier = new Promise<void>((resolve) => pending.once('test:barrier', () => resolve()));
      io.to(pending.id!).emit('test:barrier');
      await barrier;
      expect(counts).toEqual([]);

      // Disconnect broadcasts must also exclude the socket awaiting authorization.
      const disconnectBarrier = new Promise<void>((resolve) =>
        pending.once('test:closed', () => resolve()),
      );
      io.sockets.sockets.get(other.id!)!.disconnect(true);
      io.to(pending.id!).emit('test:closed');
      await disconnectBarrier;
      expect(counts).toEqual([]);

      if (logout) {
        const disconnected = new Promise<void>((resolve) =>
          pending.once('disconnect', () => resolve()),
        );
        repeatedCheck.resolve(false);
        await disconnected;
        expect(counts).toEqual([]);
      } else {
        const admitted = count(pending);
        repeatedCheck.resolve(true);
        expect(await admitted).toBe(1);
      }
    },
  );
});
