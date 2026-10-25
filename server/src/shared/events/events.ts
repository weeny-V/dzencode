/** Facts that already happened, named in the past tense. Handlers must not change what a publisher did. */
export type InventoryEvent =
  | { type: 'order.created'; orderId: number }
  | { type: 'order.deleted'; orderId: number }
  | { type: 'product.created'; productId: number; orderId: number }
  | { type: 'product.deleted'; productId: number; orderId: number };

/** A tab (one authorized socket connection) joined or left; the counter of open tabs follows these. */
export type SessionEvent =
  { type: 'session.opened'; sessionId: string } | { type: 'session.closed'; sessionId: string };

export type DomainEvent = InventoryEvent | SessionEvent;
export type DomainEventType = DomainEvent['type'];
export type EventOfType<T extends DomainEventType> = Extract<DomainEvent, { type: T }>;

export const INVENTORY_EVENT_TYPES = [
  'order.created',
  'order.deleted',
  'product.created',
  'product.deleted',
] as const satisfies readonly InventoryEvent['type'][];
