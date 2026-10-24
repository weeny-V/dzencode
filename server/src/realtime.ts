import type { Server as HttpServer } from 'node:http';

import { Server } from 'socket.io';

import type { Config } from './config.js';
import { createSessionsModule } from './modules/sessions/index.js';

/**
 * Composition root of the socket side, next to `createApp` for HTTP: puts Socket.io on the same HTTP server and
 * connects the modules that talk over sockets. It allows the same client origin as the REST API.
 */
export const attachRealtime = (
  httpServer: HttpServer,
  { clientOrigin }: Pick<Config, 'clientOrigin'>,
): Server => {
  const io = new Server(httpServer, { cors: { origin: clientOrigin } });

  createSessionsModule().attach(io);

  return io;
};
