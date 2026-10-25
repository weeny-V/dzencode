import 'server-only';

import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import { env } from '@/shared/config/env';
import { actionResult } from '@/shared/lib/actionResult';

import { request } from './http';

/** Each origin fetch gets its own deadline, including a background cache refresh. */
const readOriginJson = (path: string, signal?: AbortSignal): Promise<unknown> => {
  const timeout = AbortSignal.timeout(env.apiReadTimeoutMs);
  return request<unknown>(path, {
    // Cache the completed JSON above fetch. Next's stale-fetch revalidation drops
    // signals, so the origin fetch itself must never enter the fetch Data Cache.
    cache: 'no-store',
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
};

// React.cache only deduplicates within a render. A caller-owned signal identifies
// an independent cancellation scope and is never persisted in the Data Cache.
const readJson = cache(
  (
    apiUrl: string,
    path: string,
    revalidate: number,
    signal: AbortSignal | undefined,
    ...tags: string[]
  ) => {
    // Explicitly cancellable reads must not abort work shared by other visitors.
    if (signal || revalidate === 0) return readOriginJson(path, signal);
    return unstable_cache(
      () => readOriginJson(path),
      [JSON.stringify({ apiUrl, path, revalidate, tags })],
      { tags, revalidate },
    )();
  },
);

export const getJson = async <T>(
  path: string,
  { tags, revalidate = 60, signal }: { tags: string[]; revalidate?: number; signal?: AbortSignal },
): Promise<T> => {
  signal?.throwIfAborted();
  return (await readJson(env.serverApiUrl, path, revalidate, signal, ...tags)) as T;
};

/** Expected API and network failures render locally, without losing the rest of the page. */
export const loadOrError = actionResult;
