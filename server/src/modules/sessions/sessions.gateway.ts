import type { Server } from 'socket.io';

import type { SessionsService } from './sessions.service.js';

/** The event that carries the number of open sessions: `{ count: number }`. The client listens to the same name. */
export const SESSIONS_COUNT_EVENT = 'sessions:count';

/**
 * The socket side of the module: every connection is a session, and everybody is told the new number when one
 * opens or closes (the new tab gets it too, so it learns the number without asking).
 */
export const attachSessionsGateway = (io: Server, service: SessionsService): void => {
  io.on('connection', (socket) => {
    io.emit(SESSIONS_COUNT_EVENT, { count: service.open(socket.id) });

    socket.on('disconnect', () => {
      io.emit(SESSIONS_COUNT_EVENT, { count: service.close(socket.id) });
    });
  });
};
