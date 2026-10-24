/**
 * The registry of open sessions. A session is one open browser tab, which is one socket connection. The registry
 * lives in the memory of this process, so it counts correctly only while a single server instance runs (see
 * docs/API.md, "Realtime"): several instances would need a shared store such as the Socket.io Redis adapter.
 */
export const createSessionsService = () => {
  const sessions = new Set<string>();

  return {
    /** Registers a session and returns how many are open now. Registering the same id twice counts once. */
    open: (id: string): number => sessions.add(id).size,

    /** Forgets a session and returns how many are open now. An unknown id changes nothing. */
    close: (id: string): number => {
      sessions.delete(id);
      return sessions.size;
    },

    count: (): number => sessions.size,
  };
};

export type SessionsService = ReturnType<typeof createSessionsService>;
