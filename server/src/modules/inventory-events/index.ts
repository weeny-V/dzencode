// Public interface of the module: other modules import only from this file.
import type { Server } from 'socket.io';

import type { EventBus } from '../../shared/events/eventBus.js';
import { attachInventoryEventsGateway } from './inventory-events.gateway.js';

export const createInventoryEventsModule = () => ({
  attach: (io: Server, events: Pick<EventBus, 'on'>, room: string) =>
    attachInventoryEventsGateway(io, events, room),
});

export { INVENTORY_CHANGED_EVENT } from './inventory-events.gateway.js';
