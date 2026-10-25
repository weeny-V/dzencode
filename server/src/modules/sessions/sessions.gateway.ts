import type { Server, Socket } from 'socket.io';

import type { EventBus } from '../../shared/events/eventBus.js';
import type { SessionsService } from './sessions.service.js';

/** The event that carries the number of open sessions: `{ count: number }`. The client listens to the same name. */
export const SESSIONS_COUNT_EVENT = 'sessions:count';

// A Socket.io connection exists before its final asynchronous authorization has completed.
export const AUTHORIZED_TABS_ROOM = 'sessions:authorized-tabs';

/**
 * Each fully authorized connection is a counter session. The gateway only announces `session.opened` and
 * `session.closed` on the bus; the counter reacts to them and broadcasts to the authorized tabs only, including
 * the new tab so it learns the count without asking.
 */
export const attachSessionsGateway = (
  io: Server,
  service: SessionsService,
  events: Pick<EventBus, 'publish' | 'on'>,
  authorize: (socket: Socket) => Promise<void>,
): (() => void) => {
  const unsubscribe = [
    events.on('session.opened', ({ sessionId }) => {
      io.to(AUTHORIZED_TABS_ROOM).emit(SESSIONS_COUNT_EVENT, { count: service.open(sessionId) });
    }),
    events.on('session.closed', ({ sessionId }) => {
      io.to(AUTHORIZED_TABS_ROOM).emit(SESSIONS_COUNT_EVENT, { count: service.close(sessionId) });
    }),
  ];
  io.on('connection', (socket) => {
    const open = async () => {
      try {
        await authorize(socket);
        if (!socket.connected) return;
        await socket.join(AUTHORIZED_TABS_ROOM);
        if (!socket.connected) return;
        events.publish({ type: 'session.opened', sessionId: socket.id });
        socket.on('disconnect', () => {
          events.publish({ type: 'session.closed', sessionId: socket.id });
        });
      } catch {
        socket.disconnect(true);
      }
    };
    void open();
  });
  return () => {
    for (const stop of unsubscribe) stop();
  };
};
