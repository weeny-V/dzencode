import type { IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http';

import { Server, type Socket } from 'socket.io';

import type { Config } from './config.js';
import { type AuthService, readAuthCookie } from './modules/auth/index.js';
import { createInventoryEventsModule } from './modules/inventory-events/index.js';
import { AUTHORIZED_TABS_ROOM, createSessionsModule } from './modules/sessions/index.js';
import type { EventBus } from './shared/events/eventBus.js';

/**
 * Composition root of the socket side, next to `createApp` for HTTP: puts Socket.io on the same HTTP server and
 * connects the modules that talk over sockets. It allows the same client origin as the REST API.
 */
export const attachRealtime = (
  httpServer: HttpServer,
  {
    clientOrigin,
    auth,
    events,
  }: Pick<Config, 'clientOrigin'> & {
    auth: Pick<AuthService, 'authenticate' | 'onRevoked'>;
    events: Pick<EventBus, 'publish' | 'on'>;
  },
): Server => {
  const io = new Server(httpServer, {
    cors: { origin: clientOrigin, credentials: true },
    // CORS alone does not protect WebSocket handshakes. Reject absent and untrusted origins too.
    allowRequest: (req, callback) => callback(null, req.headers.origin === clientOrigin),
  });
  io.engine.use((req: IncomingMessage, _res: ServerResponse, next: (error?: Error) => void) => {
    // Also check subsequent polling requests and upgrades of an existing Engine.IO session.
    if (req.headers.origin !== clientOrigin) next(new Error('Origin is not allowed'));
    else next();
  });

  const room = (sessionId: string) => `auth-session:${sessionId}`;
  const unsubscribe = auth.onRevoked((sessionId) => {
    io.in(room(sessionId)).disconnectSockets(true);
  });
  httpServer.once('close', unsubscribe);

  const sessionIds = new WeakMap<Socket, string>();
  io.use((socket, next) => {
    const authorize = async () => {
      try {
        const context = await auth.authenticate(readAuthCookie(socket.request.headers.cookie));
        sessionIds.set(socket, context.sessionId);
        next();
      } catch {
        next(new Error('Authentication required'));
      }
    };
    void authorize();
  });

  const stopSessions = createSessionsModule().attach(io, events, async (socket) => {
    const sessionId = sessionIds.get(socket);
    if (!sessionId) throw new Error('Authentication required');
    await socket.join(room(sessionId));
    // Close the authenticate/join race: logout either sees this room or this second DB check fails.
    await auth.authenticate(readAuthCookie(socket.request.headers.cookie));
  });

  const stopInventory = createInventoryEventsModule().attach(io, events, AUTHORIZED_TABS_ROOM);
  httpServer.once('close', () => {
    stopSessions();
    stopInventory();
  });

  return io;
};
