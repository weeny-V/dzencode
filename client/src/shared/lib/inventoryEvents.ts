/**
 * What other tabs and API clients changed, as announced by the server's `inventory:changed` socket event, plus
 * `resync`, which only this client creates after a reconnect ("something may have changed while I was away").
 */
export type InventoryChange =
  | { type: 'order.created' | 'order.deleted'; orderId: number }
  | { type: 'product.created' | 'product.deleted'; productId: number; orderId: number }
  | { type: 'resync' };

/** The socket event of the server that carries one inventory change. */
export const INVENTORY_CHANGED_EVENT = 'inventory:changed';
/** More than this in one batch is not a real burst: the action rejects it instead of expiring unbounded tags. */
export const MAX_CHANGES_PER_BATCH = 50;

const isId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

const parseKnown = (payload: unknown, allowResync: boolean): InventoryChange | undefined => {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const { type, orderId, productId } = payload as Record<string, unknown>;
  if (type === 'resync') return allowResync ? { type } : undefined;
  if ((type === 'order.created' || type === 'order.deleted') && isId(orderId))
    return { type, orderId };
  if (
    (type === 'product.created' || type === 'product.deleted') &&
    isId(orderId) &&
    isId(productId)
  )
    return { type, productId, orderId };
  return undefined;
};

/** A change received from the server; anything else, including `resync`, is ignored. */
export const parseServerChange = (payload: unknown) => parseKnown(payload, false);

/** The batch that reaches the Server Action: validated again, because it is user-controlled input there. */
export const parseChangeBatch = (payload: unknown): InventoryChange[] | undefined => {
  if (!Array.isArray(payload) || payload.length === 0 || payload.length > MAX_CHANGES_PER_BATCH)
    return undefined;
  const changes = payload.map((item) => parseKnown(item, true));
  return changes.every((change) => change !== undefined) ? changes : undefined;
};

const listeners = new Set<(change: InventoryChange) => void>();

/** The socket lives in the sessions feature; the inventory sync listens here without importing it. */
export function publishInventoryChange(change: InventoryChange) {
  for (const listener of [...listeners]) listener(change);
}

export function subscribeInventoryChanges(listener: (change: InventoryChange) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
