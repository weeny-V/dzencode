import { describe, expect, it } from 'vitest';

import { idleLoadable, loadingFailed, loadingStarted, loadingSucceeded } from './loadable';

describe('loadable helpers', () => {
  it('walks idle -> loading -> succeeded and keeps the data', () => {
    const slot = idleLoadable<string[]>();

    loadingStarted(slot, 'r1');
    expect(slot).toMatchObject({ status: 'loading', requestId: 'r1' });

    loadingSucceeded(slot, 'r1', ['a']);
    expect(slot).toMatchObject({ status: 'succeeded', data: ['a'] });
  });

  it('keeps the previous data while a newer request runs and clears the old error', () => {
    const slot = idleLoadable<string[]>();
    loadingStarted(slot, 'r1');
    loadingFailed(slot, { requestId: 'r1', aborted: false }, 'boom');
    expect(slot).toMatchObject({ status: 'failed', error: 'boom' });

    loadingStarted(slot, 'r2');
    loadingSucceeded(slot, 'r2', ['a']);
    loadingStarted(slot, 'r3');

    expect(slot).toMatchObject({ status: 'loading', data: ['a'], error: undefined });
  });

  it('drops the answer of a request that is no longer the latest', () => {
    const slot = idleLoadable<string[]>();
    loadingStarted(slot, 'old');
    loadingStarted(slot, 'new');

    loadingSucceeded(slot, 'old', ['stale']);
    loadingFailed(slot, { requestId: 'old', aborted: false }, 'late failure');

    expect(slot).toMatchObject({ status: 'loading', data: undefined, error: undefined });
  });

  it('returns to idle when the latest request is aborted', () => {
    const slot = idleLoadable<string[]>();
    loadingStarted(slot, 'r1');

    loadingFailed(slot, { requestId: 'r1', aborted: true }, 'Aborted');

    expect(slot).toMatchObject({ status: 'idle', error: undefined });
  });

  it('falls back to a generic message', () => {
    const slot = idleLoadable<string[]>();
    loadingStarted(slot, 'r1');

    loadingFailed(slot, { requestId: 'r1', aborted: false }, undefined);

    expect(slot.error).toBe('Request failed');
  });
});
