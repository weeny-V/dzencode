import { describe, expect, it, vi } from 'vitest';

import { type CsvWorkerResponse, serveCsv } from './csvWorker';

const setup = <Payload>(build: (payload: Payload) => string) => {
  const posted: { message: CsvWorkerResponse; transfer: Transferable[] }[] = [];
  const scope = {
    onmessage: null as ((event: MessageEvent<{ payload: Payload }>) => void) | null,
    postMessage: (message: CsvWorkerResponse, transfer: Transferable[]) =>
      posted.push({ message, transfer }),
  };
  serveCsv(scope, build);
  const send = (payload: Payload) =>
    scope.onmessage?.({ data: { payload } } as MessageEvent<{ payload: Payload }>);
  return { posted, send };
};

describe('CSV worker body', () => {
  it('answers with the UTF-8 bytes of the document and transfers the buffer', () => {
    const { posted, send } = setup((name: string) => `Привет, ${name}`);
    send('мир');
    expect(posted).toHaveLength(1);
    const { message, transfer } = posted[0];
    expect(message.ok).toBe(true);
    if (!message.ok) return;
    expect(new TextDecoder().decode(message.buffer)).toBe('Привет, мир');
    expect(transfer).toEqual([message.buffer]);
  });
  it('reports a failing build instead of dying silently', () => {
    const build = vi.fn(() => {
      throw new Error('bad data');
    });
    const { posted, send } = setup(build);
    send(1);
    expect(posted[0].message).toEqual({ ok: false, error: 'bad data' });
  });
});
