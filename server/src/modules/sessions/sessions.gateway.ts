import type { Server, Socket } from 'socket.io';

import type { SessionsService } from './sessions.service.js';

/** The event that carries the number of open sessions: `{ count: number }`. The client listens to the same name. */
export const SESSIONS_COUNT_EVENT = 'sessions:count';

// A Socket.io connection exists before its final asynchronous authorization has completed.
const AUTHORIZED_TABS_ROOM = 'sessions:authorized-tabs';

/**
 * Each fully authorized connection is a counter session. Only authorized tabs receive open/close
 * broadcasts, including the new tab so it learns the count without asking.
 */
export const attachSessionsGateway = (
  io: Server,
  service: SessionsService,
  authorize: (socket: Socket) => Promise<void>,
): void => {
  io.on('connection', (socket) => {
    const open = async () => {
      try {
        await authorize(socket);
        if (!socket.connected) return;
        await socket.join(AUTHORIZED_TABS_ROOM);
        if (!socket.connected) return;
        io.to(AUTHORIZED_TABS_ROOM).emit(SESSIONS_COUNT_EVENT, { count: service.open(socket.id) });
        socket.on('disconnect', () => {
          io.to(AUTHORIZED_TABS_ROOM).emit(SESSIONS_COUNT_EVENT, {
            count: service.close(socket.id),
          });
        });
      } catch {
        socket.disconnect(true);
      }
    };
    void open();
  });
};
