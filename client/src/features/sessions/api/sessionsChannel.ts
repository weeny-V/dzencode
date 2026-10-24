import { io } from 'socket.io-client';

import { env } from '@/shared/config/env';

/** The event of the server that carries the number of open sessions: `{ count: number }`. */
export const SESSIONS_COUNT_EVENT = 'sessions:count';

export interface SessionsChannelHandlers {
  /** The server told how many sessions (open tabs) there are, this one included. */
  onCount: (count: number) => void;
  /** The connection came up (`true`) or went away (`false`); the library reconnects by itself. */
  onConnectionChange: (connected: boolean) => void;
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
}: SessionsChannelHandlers): () => void {
  // A socket of its own, not one shared by address: closing it must really close the connection.
  const socket = io(env.apiUrl, { forceNew: true });

  socket.on('connect', () => onConnectionChange(true));
  socket.on('disconnect', () => onConnectionChange(false));
  socket.on('connect_error', () => onConnectionChange(false));
  socket.on(SESSIONS_COUNT_EVENT, (payload: unknown) => {
    if (isCountPayload(payload)) onCount(payload.count);
  });

  return () => {
    // Listeners go first: closing fires `disconnect`, which nobody should hear after the cleanup.
    socket.removeAllListeners();
    socket.disconnect();
  };
}
