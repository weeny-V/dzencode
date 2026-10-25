import 'server-only';

import { env } from '@/shared/config/env';

import { ApiError, errorMessage } from './errors';

/** Uncached transport. Callers explicitly choose credentials; never import this into client code. */
export async function rawRequest<T>(path: string, init?: RequestInit): Promise<T> {
  init?.signal?.throwIfAborted();
  const res = await fetch(env.serverApiUrl + path, { ...init, cache: 'no-store' });
  init?.signal?.throwIfAborted();
  if (!res.ok) {
    const message = await errorMessage(res);
    init?.signal?.throwIfAborted();
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json()) as T;
  init?.signal?.throwIfAborted();
  return data;
}
