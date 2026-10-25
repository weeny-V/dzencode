import 'server-only';

import { unstable_cache } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { cache } from 'react';

import { env } from '@/shared/config/env';
import type { ActionResult } from '@/shared/lib/actionResult';

import { ApiError } from './errors';
import { redirectToLogin, requireSession } from './session.server';
import { rawRequest } from './transport.server';

const readOriginJson = (path: string, token: string, signal?: AbortSignal): Promise<unknown> => {
  const timeout = AbortSignal.timeout(env.apiReadTimeoutMs);
  return rawRequest<unknown>(path, {
    cache: 'no-store',
    headers: { Authorization: 'Bearer ' + token },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
};

// Credentials are render-scoped arguments only, never persisted as cache keys or function arguments.
const readJson = cache(
  (
    apiUrl: string,
    path: string,
    revalidate: number,
    signal: AbortSignal | undefined,
    sessionId: string,
    userId: number,
    token: string,
    ...tags: string[]
  ) => {
    if (signal || revalidate === 0) return readOriginJson(path, token, signal);
    return unstable_cache(
      () => readOriginJson(path, token),
      [JSON.stringify({ apiUrl, path, revalidate, tags, sessionId, userId })],
      { tags, revalidate },
    )();
  },
);

export const getJson = async <T>(
  path: string,
  { tags, revalidate = 60, signal }: { tags: string[]; revalidate?: number; signal?: AbortSignal },
): Promise<T> => {
  signal?.throwIfAborted();
  // This MUST precede the persistent lookup, including warmed hits. Cookies stay outside unstable_cache.
  const session = await requireSession();
  try {
    return (await readJson(
      env.serverApiUrl,
      path,
      revalidate,
      signal,
      session.sessionId,
      session.user.id,
      session.token,
      ...tags,
    )) as T;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return await redirectToLogin();
    throw error;
  }
};

/** Preserve Next redirects/dynamic rendering; authentication failures never become generic load errors. */
export async function loadOrError<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ApiError && error.status === 401) return await redirectToLogin();
    return { ok: false, error: error instanceof Error ? error.message : 'Request failed' };
  }
}
