import { io } from 'socket.io-client';

import { env } from '@/shared/config/env';
import { requestAuthCheck } from '@/shared/lib/authLifecycle';
import {
  INVENTORY_CHANGED_EVENT,
  type InventoryChange,
  parseServerChange,
} from '@/shared/lib/inventoryEvents';

/** The event of the server that carries the number of open sessions: `{ count: number }`. */
export const SESSIONS_COUNT_EVENT = 'sessions:count';

export interface SessionsChannelHandlers {
  /** The server told how many sessions (open tabs) there are, this one included. */
  onCount: (count: number) => void;
  /** The connection came up (`true`) or went away (`false`); the library reconnects by itself. */
  onConnectionChange: (connected: boolean) => void;
  /**
   * Something in the inventory changed, or may have changed: a valid `inventory:changed` event, or `resync` when
   * the connection came back after a break (events sent meanwhile are gone: the server keeps no queue).
   */
  onInventoryChange?: (change: InventoryChange) => void;
}

const isCountPayload = (payload: unknown): payload is { count: number } =>
  typeof payload === 'object' &&
  payload !== null &&
  typeof (payload as { count?: unknown }).count === 'number';

/**
 * Opens the socket to the API server: one connection is one session, so this must be called once per open tab
 * and closed with the function it returns. Unlike a request, a channel talks many times, so it reports through
 * callbacks instead of a promise.
 */
export function openSessionsChannel({
  onCount,
  onConnectionChange,
  onInventoryChange,
}: SessionsChannelHandlers): () => void {
  // A socket of its own, not one shared by address: closing it must really close the connection.
  // Browser WebSockets always send Origin, including behind a same-origin reverse proxy.
  const socket = io(env.apiUrl, {
    forceNew: true,
    withCredentials: true,
    transports: ['websocket'],
  });

  let connectedBefore = false;
  socket.on('connect', () => {
    onConnectionChange(true);
    if (connectedBefore) onInventoryChange?.({ type: 'resync' });
    connectedBefore = true;
  });
  socket.on('disconnect', (reason) => {
    onConnectionChange(false);
    if (reason === 'io server disconnect') requestAuthCheck();
  });
  socket.on('connect_error', (error) => {
    onConnectionChange(false);
    if (error?.message === 'Authentication required') requestAuthCheck();
  });
  socket.on(SESSIONS_COUNT_EVENT, (payload: unknown) => {
    if (isCountPayload(payload)) onCount(payload.count);
  });

  socket.on(INVENTORY_CHANGED_EVENT, (payload: unknown) => {
    const change = parseServerChange(payload);
    if (change) onInventoryChange?.(change);
  });

  return () => {
    // Listeners go first: closing fires `disconnect`, which nobody should hear after the cleanup.
    socket.removeAllListeners();
    socket.disconnect();
  };
}
