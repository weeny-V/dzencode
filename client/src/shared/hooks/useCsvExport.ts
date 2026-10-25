'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ActionResult } from '@/shared/lib/actionResult';
import type { CsvWorkerResponse } from '@/shared/lib/csvWorker';

import { useAuthSession } from './useAuthSession';

export type CsvExportStatus = 'idle' | 'loading' | 'building' | 'error';

interface CsvExportOptions<Payload> {
  /** Reads what the document is made of (a Server Action). The current search and filter are its input. */
  load: () => Promise<ActionResult<Payload>>;
  /** Starts the worker. The `new Worker(new URL(...))` call has to be written where the bundler can see it. */
  createWorker: () => Worker;
  /** The name of the saved file. */
  filename: () => string;
}

const MIME = 'text/csv;charset=utf-8';

function download(buffer: ArrayBuffer, filename: string) {
  const url = URL.createObjectURL(new Blob([buffer], { type: MIME }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // The browser has started the download by the time this runs.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Exports a list as CSV: reads the data on the server, builds the document in a Web Worker so a long list does not
 * block the page, then saves it. One export at a time; `cancel` (or leaving the page) stops the worker and drops a
 * late result. Nothing is saved after the authenticated session has ended.
 */
export function useCsvExport<Payload>({ load, createWorker, filename }: CsvExportOptions<Payload>) {
  const session = useAuthSession();
  const [status, setStatus] = useState<CsvExportStatus>('idle');
  const run = useRef(0);
  const worker = useRef<Worker | undefined>(undefined);

  const stop = useCallback(() => {
    run.current += 1;
    worker.current?.terminate();
    worker.current = undefined;
  }, []);
  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    if (!session.isCurrent()) return;
    stop();
    const mine = run.current;
    const alive = () => run.current === mine && session.isCurrent();
    setStatus('loading');
    try {
      const result = await load();
      if (!alive()) return;
      if (!result.ok) throw new Error(result.error);
      setStatus('building');
      const response = await new Promise<CsvWorkerResponse>((resolve, reject) => {
        const created = createWorker();
        worker.current = created;
        created.onmessage = (event: MessageEvent<CsvWorkerResponse>) => resolve(event.data);
        created.onerror = () => reject(new Error('The export worker failed'));
        created.postMessage({ payload: result.data });
      });
      if (!alive()) return;
      if (!response.ok) throw new Error(response.error);
      download(response.buffer, filename());
      setStatus('idle');
    } catch {
      if (alive()) setStatus('error');
    } finally {
      if (run.current === mine) {
        worker.current?.terminate();
        worker.current = undefined;
      }
    }
  }, [createWorker, filename, load, session, stop]);

  const cancel = useCallback(() => {
    stop();
    setStatus('idle');
  }, [stop]);

  return { status, start: () => void start(), cancel };
}
