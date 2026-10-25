import type { Server } from 'socket.io';

import type { EventBus } from '../../shared/events/eventBus.js';
import { INVENTORY_EVENT_TYPES, type InventoryEvent } from '../../shared/events/events.js';

/** The Socket.io event with the inventory change; its payload is the domain event itself. */
export const INVENTORY_CHANGED_EVENT = 'inventory:changed';

/**
 * Forwards inventory events to the fully authorized tabs. The inventory is shared by every user (stage 6c), so
 * there are no per-user rooms. The payload names only what changed: a tab re-reads the data it shows.
 */
export const attachInventoryEventsGateway = (
  io: Server,
  events: Pick<EventBus, 'on'>,
  room: string,
): (() => void) => {
  const unsubscribe = INVENTORY_EVENT_TYPES.map((type) =>
    events.on(type, (event: InventoryEvent) => {
      io.to(room).emit(INVENTORY_CHANGED_EVENT, event);
    }),
  );
  return () => {
    for (const stop of unsubscribe) stop();
  };
};
