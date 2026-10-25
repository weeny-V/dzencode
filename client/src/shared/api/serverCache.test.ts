// Initialize the real Next async storages before loading its cache implementation.
import 'next/dist/server/node-environment-baseline';

import {
  workAsyncStorage,
  type WorkStore,
} from 'next/dist/server/app-render/work-async-storage.external';
import { workUnitAsyncStorage } from 'next/dist/server/app-render/work-unit-async-storage.external';
import type { IncrementalCache } from 'next/dist/server/lib/incremental-cache';
import { createPatchedFetcher } from 'next/dist/server/lib/patch-fetch';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deferred } from '@/testing/fixtures';

import { getJson } from './server';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Only persistence is faked: both unstable_cache and patched fetch are the installed Next code. */
function staleCacheContext() {
  const value = [{ id: 7 }];
  const persistence = {
    generateSimpleCacheKey: vi.fn((key: string) => Promise.resolve(`function:${key}`)),
    generateCacheKey: vi.fn((url: string) => Promise.resolve(`fetch:${url}`)),
    lock: vi.fn(() => Promise.resolve(() => Promise.resolve())),
    get: vi.fn((key: string) =>
      Promise.resolve({
        isStale: true,
        lastModified: 0,
        value: {
          kind: 'FETCH',
          revalidate: 60,
          data: {
            headers: {},
            status: 200,
            url: 'http://localhost:4000/orders',
            body: key.startsWith('fetch:')
              ? Buffer.from(JSON.stringify(value)).toString('base64')
              : JSON.stringify(value),
          },
        },
      }),
    ),
    set: vi.fn(() => Promise.resolve()),
  };
  // Simulate only the request context fields used by these Next cache paths.
  const store = {
    route: '/orders',
    page: '/orders/page',
    incrementalCache: persistence as unknown as IncrementalCache,
    cacheComponentsEnabled: false,
    previouslyRevalidatedTags: [],
    pendingRevalidates: {},
    requestStartTime: Date.now(),
    refreshTagsByCacheKind: new Map<string, never>(),
    shouldTrackFetchMetrics: false,
  } as unknown as WorkStore;
  return { store, persistence, value };
}

describe('Next background cache refresh deadline', () => {
  it.each(['headers', 'body'] as const)(
    'aborts a stalled background %s read using a fresh server timeout',
    async (phase) => {
      const { store, persistence, value } = staleCacheContext();
      const timeout = new AbortController();
      const error = new DOMException('API read timed out', 'TimeoutError');
      const timeoutFactory = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal);
      const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originResponse = deferred<Response>();
      let body: ReadableStreamDefaultController<Uint8Array> | undefined;
      let originSignal: AbortSignal | null | undefined;
      const origin = vi.fn((_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        originSignal = init?.signal;
        originSignal?.addEventListener(
          'abort',
          () => {
            if (phase === 'headers') originResponse.reject(error);
            else body?.error(error);
          },
          { once: true },
        );
        if (phase === 'body') {
          return Promise.resolve(
            new Response(
              new ReadableStream<Uint8Array>({
                start(controller) {
                  body = controller;
                  controller.enqueue(new TextEncoder().encode('['));
                },
              }),
            ),
          );
        }
        return originResponse.promise;
      });
      vi.stubGlobal(
        'fetch',
        createPatchedFetcher(origin, { workAsyncStorage, workUnitAsyncStorage }),
      );

      try {
        expect(
          await workAsyncStorage.run(store, () => getJson('/orders', { tags: ['orders'] })),
        ).toEqual(value);
        await vi.waitFor(() => expect(origin).toHaveBeenCalledOnce());
        expect(originSignal).toBeInstanceOf(AbortSignal);
        expect(originSignal?.aborted).toBe(false);
        expect(timeoutFactory).toHaveBeenCalledWith(10_000);
        const originInit = origin.mock.calls[0]?.[1];
        expect(originInit?.cache).toBe('no-store');
        expect(persistence.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ tags: ['orders'], revalidate: 60 }),
        );
        // Expire the actual signal received by the native transport, not a mocked Next fetch.
        timeout.abort(error);
        await Promise.all(Object.values(store.pendingRevalidates ?? {}));
        expect(originSignal?.aborted).toBe(true);
        expect(persistence.set).not.toHaveBeenCalled();
        expect(logged).toHaveBeenCalledWith(expect.stringContaining('revalidating cache'), error);
      } finally {
        // Also drain the old broken implementation when checking that this regression test fails there.
        if (!originSignal?.aborted) {
          if (phase === 'headers') originResponse.resolve(Response.json([]));
          else {
            body?.enqueue(new TextEncoder().encode(']'));
            body?.close();
          }
        }
        await Promise.allSettled(Object.values(store.pendingRevalidates ?? {}));
      }
    },
  );
});

vi.mock('@/shared/api/session.server', async () => {
  const { testSession } = await import('@/testing/auth');
  return {
    readSession: vi.fn(() => Promise.resolve(testSession)),
    requireSession: vi.fn(() => Promise.resolve(testSession)),
    redirectToLogin: vi.fn(() => {
      throw new Error('NEXT_REDIRECT');
    }),
  };
});
