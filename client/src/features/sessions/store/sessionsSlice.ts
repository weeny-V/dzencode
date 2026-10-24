import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/** `connecting` until the first answer, then `online` or `offline` (the socket library keeps retrying). */
export type ConnectionStatus = 'connecting' | 'online' | 'offline';

export interface SessionsState {
  connection: ConnectionStatus;
  /** Open sessions as the server last told; unknown without a connection. */
  count: number | undefined;
}

/** The part of the root state this feature reads: the app mounts the reducer under `sessions`. */
export interface SessionsRootState {
  sessions: SessionsState;
}

const initialState: SessionsState = { connection: 'connecting', count: undefined };

const sessionsSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    connectionChanged: (state, { payload: connected }: PayloadAction<boolean>) => {
      state.connection = connected ? 'online' : 'offline';
      // A number from before the break may be wrong by now: do not show it as current.
      if (!connected) state.count = undefined;
    },
    countReceived: (state, { payload: count }: PayloadAction<number>) => {
      state.count = count;
    },
  },
});

export const { connectionChanged, countReceived } = sessionsSlice.actions;
export const sessionsReducer = sessionsSlice.reducer;

export const selectSessions = (state: SessionsRootState) => state.sessions;
