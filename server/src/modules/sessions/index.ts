// Public interface of the module: other modules import only from this file.
import type { Server } from 'socket.io';

import { attachSessionsGateway } from './sessions.gateway.js';
import { createSessionsService } from './sessions.service.js';

export const createSessionsModule = () => {
  const service = createSessionsService();
  return { service, attach: (io: Server) => attachSessionsGateway(io, service) };
};

export { SESSIONS_COUNT_EVENT } from './sessions.gateway.js';
export type { SessionsService } from './sessions.service.js';
