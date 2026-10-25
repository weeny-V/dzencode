import { act, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { invalidateAuth } from '@/shared/lib/authLifecycle';
import type { CsvWorkerResponse } from '@/shared/lib/csvWorker';
import { ExportButton } from '@/shared/ui/ExportButton';
import { TestAuth } from '@/testing/auth';
import { deferred } from '@/testing/fixtures';

import { useCsvExport } from './useCsvExport';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<CsvWorkerResponse>) => void) | null = null;
  onerror: (() => void) | null = null;
  posted: unknown[] = [];
  terminated = false;
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage(message: unknown) {
    this.posted.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  reply(response: CsvWorkerResponse) {
    this.onmessage?.({ data: response } as MessageEvent<CsvWorkerResponse>);
  }
}

const labels = { export: 'Export CSV', busy: 'Preparing…', cancel: 'Cancel', failed: 'Failed' };
const saved = vi.fn();
const createObjectURL = vi.fn(() => 'blob:csv');
const revokeObjectURL = vi.fn();

function Harness({
  load,
}: {
  load: () => Promise<{ ok: true; data: { rows: number } } | { ok: false; error: string }>;
}) {
  const { status, start, cancel } = useCsvExport({
    load,
    createWorker: () => new FakeWorker() as unknown as Worker,
    filename: () => 'orders-test.csv',
  });
  return <ExportButton status={status} labels={labels} onStart={start} onCancel={cancel} />;
}
const mount = (load: Parameters<typeof Harness>[0]['load']) =>
  render(<Harness load={load} />, {
    wrapper: ({ children }: { children: ReactNode }) => <TestAuth>{children}</TestAuth>,
  });
const flush = () => act(() => Promise.resolve());
const click = async (name: string) => {
  await act(async () => {
    screen.getByRole('button', { name }).click();
    await Promise.resolve();
  });
};

beforeEach(() => {
  FakeWorker.instances = [];
  saved.mockClear();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  vi.useFakeTimers();
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    saved(this.download);
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const ready = (buffer = new TextEncoder().encode('a,b').buffer) => ({ ok: true as const, buffer });

describe('CSV export', () => {
  it('reads the data, builds the file in a worker and saves it', async () => {
    mount(() => Promise.resolve({ ok: true, data: { rows: 2 } }));
    await click('Export CSV');
    await flush();
    expect(screen.getByRole('status')).toHaveTextContent('Preparing…');
    const [worker] = FakeWorker.instances;
    expect(worker?.posted).toEqual([{ payload: { rows: 2 } }]);
    act(() => worker?.reply(ready()));
    await flush();
    expect(saved).toHaveBeenCalledWith('orders-test.csv');
    expect(createObjectURL).toHaveBeenCalledOnce();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv');
    expect(worker?.terminated).toBe(true);
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
  });
  it('shows a failure when the data cannot be read, and starts no worker', async () => {
    mount(() => Promise.resolve({ ok: false, error: 'Offline' }));
    await click('Export CSV');
    await flush();
    expect(screen.getByRole('alert')).toHaveTextContent('Failed');
    expect(FakeWorker.instances).toHaveLength(0);
    expect(saved).not.toHaveBeenCalled();
  });
  it('shows a failure when the worker reports one or crashes', async () => {
    mount(() => Promise.resolve({ ok: true, data: { rows: 1 } }));
    await click('Export CSV');
    await flush();
    act(() => FakeWorker.instances[0]?.reply({ ok: false, error: 'bad' }));
    await flush();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await click('Export CSV');
    await flush();
    act(() => FakeWorker.instances[1]?.onerror?.());
    await flush();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(saved).not.toHaveBeenCalled();
  });
  it('cancel stops the worker and a late answer saves nothing', async () => {
    mount(() => Promise.resolve({ ok: true, data: { rows: 1 } }));
    await click('Export CSV');
    await flush();
    const [worker] = FakeWorker.instances;
    await click('Cancel');
    expect(worker?.terminated).toBe(true);
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
    act(() => worker?.reply(ready()));
    await flush();
    expect(saved).not.toHaveBeenCalled();
  });
  it('drops data that arrives after cancel, before any worker exists', async () => {
    const gate = deferred<{ ok: true; data: { rows: number } }>();
    mount(() => gate.promise);
    await click('Export CSV');
    await click('Cancel');
    await act(async () => {
      gate.resolve({ ok: true, data: { rows: 1 } });
      await gate.promise;
    });
    expect(FakeWorker.instances).toHaveLength(0);
  });
  it('stops the worker when the page is left', async () => {
    const view = mount(() => Promise.resolve({ ok: true, data: { rows: 1 } }));
    await click('Export CSV');
    await flush();
    const [worker] = FakeWorker.instances;
    view.unmount();
    expect(worker?.terminated).toBe(true);
  });
  it('saves nothing after the authenticated session ended', async () => {
    mount(() => Promise.resolve({ ok: true, data: { rows: 1 } }));
    await click('Export CSV');
    await flush();
    act(() => invalidateAuth());
    act(() => FakeWorker.instances[0]?.reply(ready()));
    await flush();
    expect(saved).not.toHaveBeenCalled();
  });
});
