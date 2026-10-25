/** The messages between the page and a CSV worker. The result is transferred, not copied. */
export interface CsvWorkerRequest<Payload> {
  payload: Payload;
}

export type CsvWorkerResponse = { ok: true; buffer: ArrayBuffer } | { ok: false; error: string };

/**
 * The body of a CSV worker: builds the document from the request and answers with its UTF-8 bytes. The page asks
 * for one document per worker; `build` must be a pure function of the payload.
 */
export function serveCsv<Payload>(
  scope: {
    onmessage: ((event: MessageEvent<CsvWorkerRequest<Payload>>) => void) | null;
    postMessage: (message: CsvWorkerResponse, transfer: Transferable[]) => void;
  },
  build: (payload: Payload) => string,
) {
  scope.onmessage = (event) => {
    try {
      const { buffer } = new TextEncoder().encode(build(event.data.payload));
      scope.postMessage({ ok: true, buffer }, [buffer]);
    } catch (error) {
      scope.postMessage(
        { ok: false, error: error instanceof Error ? error.message : 'The export failed' },
        [],
      );
    }
  };
}
