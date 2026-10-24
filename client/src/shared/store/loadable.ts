/** Where a piece of server data is: `idle` (never asked), `loading`, `succeeded` or `failed`. */
export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

/**
 * The state of one request in a Redux slice. `data` keeps the last successful result while a newer request
 * runs, so a list can stay on screen (dimmed) instead of flashing empty. `requestId` is the id of the latest
 * request: the answer of an older one (a search typed over, a retry) is dropped, whatever order they arrive in.
 */
export interface Loadable<T> {
  status: LoadStatus;
  data: T | undefined;
  /** Message of the last failure; cleared when a new request starts. */
  error: string | undefined;
  requestId: string | undefined;
}

export const idleLoadable = <T>(): Loadable<T> => ({
  status: 'idle',
  data: undefined,
  error: undefined,
  requestId: undefined,
});

// Helpers for the `extraReducers` of `createAsyncThunk` actions. They change the (Immer) draft they get.

export const loadingStarted = <T>(slot: Loadable<T>, requestId: string): void => {
  slot.status = 'loading';
  slot.error = undefined;
  slot.requestId = requestId;
};

export const loadingSucceeded = <T>(slot: Loadable<T>, requestId: string, data: T): void => {
  if (slot.requestId !== requestId) return;
  slot.status = 'succeeded';
  slot.data = data;
};

export const loadingFailed = <T>(
  slot: Loadable<T>,
  meta: { requestId: string; aborted: boolean },
  message: string | undefined,
): void => {
  if (slot.requestId !== meta.requestId) return;
  if (meta.aborted) {
    // Nobody waits for the answer any more (the page was left): do not stay "loading" forever.
    slot.status = 'idle';
    return;
  }
  slot.status = 'failed';
  slot.error = message ?? 'Request failed';
};
